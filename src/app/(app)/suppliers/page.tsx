"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useSubmit } from "@/lib/useSubmit";
import { toastDone, toastApiError } from "@/lib/toast";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { SupplierOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "next/navigation";

// Same convention as the products and users pages: one empty-form constant, so opening the modal
// and resetting after a successful create share a single definition.
const BLANK = { name: "", email: "", phone: "" };

export default function SuppliersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.supplierWrite);
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<SupplierOut> | null>(null);
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
      
      setData(await api.get<PaginatedResponse<SupplierOut>>(`/suppliers?${params.toString()}`)); 
    }
    catch (e) { toastApiError(e, "Could not load suppliers."); }
  }
  useEffect(() => { void load(); }, [currentPage, searchQuery]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await runSubmit(async () => {
      try {
        await api.post("/suppliers", {
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
        });
        toastDone("Supplier added");
        setOpen(false); setForm(BLANK); await load();
      } catch (e) { toastApiError(e); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Suppliers</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={1.75} /> Add supplier
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search by name or email..." />
      </div>

      {!data ? <SkeletonRows cols={4} /> : data.items.length === 0 ? (
        <EmptyState 
          message="No suppliers found." 
          action={canWrite && !searchQuery ? <Button variant="primary" onClick={() => setOpen(true)}>Add supplier</Button> : undefined}
        />
      ) : (
        <>
          <TableShell>
            <thead><tr><Th numeric>ID</Th><Th>Name</Th><Th>Email</Th><Th>Phone</Th></tr></thead>
            <tbody>
              {data.items.map((s) => (
                <Tr key={s.id}>
                  <Td numeric>{s.id}</Td>
                  <Td>{s.name}</Td>
                  <Td mono>{s.email ?? "—"}</Td>
                  <Td mono>{s.phone ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination total={data.total} page={data.page} pages={data.pages} />
        </>
      )}

      <Modal open={open} title="Add supplier" onClose={() => setOpen(false)}
        footer={<>
          <Button onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" form="sup-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add supplier"}
          </Button>
        </>}>
        <form id="sup-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
