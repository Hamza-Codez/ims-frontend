"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { ACTION, TERM } from "@/lib/labels";
import { toastDone, toastApiError } from "@/lib/toast";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { AlertChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import { useStock } from "@/features/inventory/useStock";
import type { ProductOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";

export default function InventoryPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.inventoryWrite);
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const { data, error, reload } = useStock(currentPage, searchQuery);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", quantity: "", reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<PaginatedResponse<ProductOut>>("/products?limit=1000")
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // ADJ-1 signed and non-zero; ADJ-2 reason mandatory. Both are enforced server-side too.
      await api.post("/adjustments", {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        reason: form.reason,
      });
      toastDone(ACTION.adjust.toast);
      setOpen(false);
      setForm({ product_id: "", quantity: "", reason: "" });
      await reload();
    } catch (e) {
      toastApiError(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) return <EmptyState message={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Inventory</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <SlidersHorizontal size={18} strokeWidth={1.75} /> {ACTION.adjust.label}
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-text-secondary mb-2">
        On-hand is derived from the ledger, never edited directly. Corrections are new movements.
      </p>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search by SKU or name..." />
      </div>

      {!data ? (
        <SkeletonRows cols={5} />
      ) : data.items.length === 0 ? (
        <EmptyState message="No products yet. Add your first product." />
      ) : (
        <>
          <TableShell>
          <thead>
            <tr>
              <Th>{TERM.sku}</Th>
              <Th>Product</Th>
              <Th numeric>On hand</Th>
              <Th numeric>{TERM.reorderPoint}</Th>
              <Th>State</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <Tr key={r.product_id}>
                <Td mono>{r.sku}</Td>
                <Td>{r.name}</Td>
                <Td numeric>{r.quantity_on_hand}</Td>
                <Td numeric>{r.reorder_point}</Td>
                <Td>
                  <AlertChip state={r.alert_state} />
                </Td>
                <Td className="text-right">
                  <Link
                    href={"/inventory/" + r.product_id}
                    className="text-sm underline-offset-2 hover:underline"
                  >
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

      <Modal
        open={open}
        title={ACTION.adjust.label}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" form="adj-form" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adjusting..." : ACTION.adjust.label}
            </Button>
          </>
        }
      >
        <form id="adj-form" onSubmit={adjust} className="flex flex-col gap-4">
          <Field label="Product">
            <Select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.quantity_on_hand} on hand)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" hint="Signed and non-zero: -3 for shrinkage, 5 for a stock find.">
            <Input
              mono
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </Field>
          <Field label="Reason" hint="Required — every adjustment is auditable.">
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
