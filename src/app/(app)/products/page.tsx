"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useSubmit } from "@/lib/useSubmit";
import { TERM } from "@/lib/labels";
import { toastDone, toastApiError } from "@/lib/toast";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { useSearchParams } from "next/navigation";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { CategoryOut, ProductOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";

const BLANK = { sku: "", name: "", category_id: "", unit_of_measure: "", reorder_point: "0" };

export default function ProductsPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.catalogWrite);
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<ProductOut> | null>(null);
  const [cats, setCats] = useState<PaginatedResponse<CategoryOut> | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  // Ref-backed: a plain `useState` guard is read from a stale closure, so three fast
  // clicks all saw `false` and all three fired. See lib/useSubmit.ts.
  const { busy: isSubmitting, run: runSubmit } = useSubmit();

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchQuery) params.set('search', searchQuery);

      const [p, c] = await Promise.all([
        api.get<PaginatedResponse<ProductOut>>(`/products?${params.toString()}`),
        api.get<PaginatedResponse<CategoryOut>>("/categories?limit=1000") // Need all categories for the dropdown
      ]);
      setData(p); setCats(c);
    } catch (e) { toastApiError(e, "Could not load products."); }
  }
  useEffect(() => { void load(); }, [currentPage, searchQuery]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await runSubmit(async () => {
      try {
        // CAT-3: quantity_on_hand is never sent — it is server-derived from the ledger.
        await api.post("/products", {
          sku: form.sku,
          name: form.name,
          category_id: Number(form.category_id),
          unit_of_measure: form.unit_of_measure,
          reorder_point: Number(form.reorder_point),
        });
        toastDone("Product added");
        setOpen(false); setForm(BLANK); await load();
      } catch (e) { toastApiError(e); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Products</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={1.75} /> Add product
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search by name or SKU..." />
      </div>

      {!data ? <SkeletonRows cols={6} /> : data.items.length === 0 ? (
        <EmptyState
          message="No products found."
          action={canWrite && !searchQuery ? <Button variant="primary" onClick={() => setOpen(true)}>Add product</Button> : undefined}
        />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>{TERM.sku}</Th><Th>Name</Th><Th>Unit</Th>
                <Th numeric>On hand</Th><Th numeric>{TERM.reorderPoint}</Th><Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <Tr key={p.id}>
                  <Td mono>{p.sku}</Td>
                  <Td>{p.name}</Td>
                  <Td mono>{p.unit_of_measure}</Td>
                  <Td numeric>{p.quantity_on_hand}</Td>
                  <Td numeric>{p.reorder_point}</Td>
                  <Td className="text-right">
                    <Link href={`/inventory/${p.id}`} className="text-sm underline-offset-2 hover:underline">
                      {TERM.stockMovement}
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination total={data.total} page={data.page} pages={data.pages} />
        </>
      )}

      <Modal open={open} title="Add product" onClose={() => setOpen(false)}
        footer={<>
          <Button onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" form="prod-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add product"}
          </Button>
        </>}>
        <form id="prod-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label={TERM.sku}>
            <Input mono value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Category">
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
              <option value="">Select a category</option>
              {cats?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Unit of measure" hint="Immutable once the product has movement history (CAT-5).">
            <Input mono value={form.unit_of_measure}
              onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} required />
          </Field>
          <Field label={TERM.reorderPoint}>
            <Input mono type="number" min={0} value={form.reorder_point}
              onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} required />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
