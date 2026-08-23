"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { toastDone, toastApiError } from "@/lib/toast";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { SupplierOut } from "@/types/api";

export default function SuppliersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.supplierWrite);
  const [rows, setRows] = useState<SupplierOut[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  async function load() {
    try { setRows(await api.get<SupplierOut[]>("/suppliers")); }
    catch (e) { toastApiError(e, "Could not load suppliers."); }
  }
  useEffect(() => { void load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/suppliers", {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
      });
      toastDone("Supplier added");
      setOpen(false); setForm({ name: "", email: "", phone: "" }); await load();
    } catch (e) { toastApiError(e); }
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

      {!rows ? <SkeletonRows cols={4} /> : rows.length === 0 ? (
        <EmptyState message="No suppliers yet. Add the one you buy from most." />
      ) : (
        <TableShell>
          <thead><tr><Th numeric>ID</Th><Th>Name</Th><Th>Email</Th><Th>Phone</Th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <Tr key={s.id}>
                <Td numeric>{s.id}</Td>
                <Td>{s.name}</Td>
                <Td mono>{s.email ?? "—"}</Td>
                <Td mono>{s.phone ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={open} title="Add supplier" onClose={() => setOpen(false)}
        footer={<>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" form="sup-form" type="submit">Add supplier</Button>
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
