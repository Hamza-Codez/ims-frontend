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
import type { CategoryOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "next/navigation";

export default function CategoriesPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.catalogWrite);
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<CategoryOut> | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // Ref-backed: a plain `useState` guard is read from a stale closure, so three fast
  // clicks all saw `false` and all three fired. See lib/useSubmit.ts.
  const { busy: isSubmitting, run: runSubmit } = useSubmit();
  const [confirm, setConfirm] = useState<CategoryOut | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchQuery) params.set('search', searchQuery);
      
      setData(await api.get<PaginatedResponse<CategoryOut>>(`/categories?${params.toString()}`));
    } catch (e) {
      toastApiError(e, "Could not load categories.");
    }
  }
  useEffect(() => { void load(); }, [currentPage, searchQuery]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await runSubmit(async () => {
      try {
        await api.post("/categories", { name });
        toastDone("Category added");
        setOpen(false); setName(""); await load();
      } catch (e) { toastApiError(e); }
    });
  }

  async function remove() {
    if (!confirm) return;
    try {
      await api.del(`/categories/${confirm.id}`);
      toastDone("Category removed");
      setConfirm(null); await load();
    } catch (e) { toastApiError(e); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Categories</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={1.75} /> Add category
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search categories..." />
      </div>

      {!data ? <SkeletonRows cols={3} /> : data.items.length === 0 ? (
        <EmptyState
          message="No categories found."
          action={canWrite && !searchQuery ? <Button variant="primary" onClick={() => setOpen(true)}>Add category</Button> : undefined}
        />
      ) : (
        <>
          <TableShell>
            <thead><tr><Th numeric>ID</Th><Th>Name</Th><Th>&nbsp;</Th></tr></thead>
            <tbody>
              {data.items.map((c) => (
                <Tr key={c.id}>
                  <Td numeric>{c.id}</Td>
                  <Td>{c.name}</Td>
                  <Td className="text-right">
                    {canWrite ? (
                      <Button variant="danger" onClick={() => setConfirm(c)}>Remove</Button>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination total={data.total} page={data.page} pages={data.pages} />
        </>
      )}

      <Modal open={open} title="Add category" onClose={() => setOpen(false)}
        footer={<>
          <Button onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" form="cat-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add category"}
          </Button>
        </>}>
        <form id="cat-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        </form>
      </Modal>

      {/* §6 — every destructive action sits behind a confirmation modal. */}
      <Modal open={!!confirm} title="Remove category" onClose={() => setConfirm(null)}
        footer={<>
          <Button onClick={() => setConfirm(null)}>Keep</Button>
          <Button variant="destructive" onClick={remove}>Remove</Button>
        </>}>
        <p className="text-sm">
          Remove <span className="data">{confirm?.name}</span>? It is soft-deleted, so past movements keep
          their reference and the name stays taken (CAT-4).
        </p>
      </Modal>
    </div>
  );
}
