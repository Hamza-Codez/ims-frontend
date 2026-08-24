"use client";

import { useEffect, useState } from "react";
import { Plus, PackageCheck, Ban } from "lucide-react";
import { api, newIdempotencyKey } from "@/lib/api";
import { useSubmit } from "@/lib/useSubmit";
import { toastDone, toastApiError } from "@/lib/toast";
import { ACTION, TERM } from "@/lib/labels";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { StatusChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { PoOut, ProductOut, SupplierOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "next/navigation";

export default function PurchaseOrdersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.poWrite);
  const canReceive = allowed(user?.role, CAN.poReceive);

  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<PoOut> | null>(null);
  const [products, setProducts] = useState<PaginatedResponse<ProductOut> | null>(null);
  const [suppliers, setSuppliers] = useState<PaginatedResponse<SupplierOut> | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ supplier_id: "", product_id: "", ordered_qty: "1" });
  const [receiving, setReceiving] = useState<PoOut | null>(null);
  const [receiptQty, setReceiptQty] = useState<Record<number, string>>({});
  const [cancelling, setCancelling] = useState<PoOut | null>(null);

  // One guard per action, so receiving on one row cannot disable the cancel button on another.
  const createGuard = useSubmit();
  const receiveGuard = useSubmit();
  const cancelGuard = useSubmit();
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Regenerated each time the form opens, so a retry of THIS order replays instead of duplicating
  // while a genuinely new order still gets its own key.
  const [createKey, setCreateKey] = useState(newIdempotencyKey);

  function openCreate() {
    setCreateKey(newIdempotencyKey());
    setCreating(true);
  }

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchQuery) params.set('search', searchQuery);

      setData(await api.get<PaginatedResponse<PoOut>>(`/purchase-orders?${params.toString()}`));
    } catch (e) {
      toastApiError(e, "Could not load " + TERM.purchaseOrder + ".");
    }
  }

  // The dropdown lists are reference data: they do not change because an order was created, so
  // they load once instead of on every reload after every mutation. `size`, not `limit` — the API
  // takes page/size, so `limit=1000` was silently ignored and these selects only ever held the
  // first 20 rows.
  async function loadReferenceData() {
    try {
      const [pr, su] = await Promise.all([
        api.get<PaginatedResponse<ProductOut>>("/products?size=1000"),
        api.get<PaginatedResponse<SupplierOut>>("/suppliers?size=1000"),
      ]);
      setProducts(pr);
      setSuppliers(su);
    } catch (e) {
      toastApiError(e, "Could not load products and suppliers.");
    }
  }

  useEffect(() => {
    void load();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    void loadReferenceData();
  }, []);

  const sku = (id: number) => products?.items.find((p) => p.id === id)?.sku ?? String(id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await createGuard.run(async () => {
      try {
        await api.post(
          "/purchase-orders",
          {
            supplier_id: Number(draft.supplier_id),
            lines: [{ product_id: Number(draft.product_id), ordered_qty: Number(draft.ordered_qty) }],
          },
          createKey,
        );
        toastDone(TERM.purchaseOrder + " created");
        setCreating(false);
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function submitPo(po: PoOut) {
    // Row actions are guarded per row: `submittingId` disables just the button that was pressed,
    // and the id check stops a second click on the SAME row while the first is still running.
    if (submittingId !== null) return;
    setSubmittingId(po.id);
    try {
      await api.post("/purchase-orders/" + po.id + "/submit");
      toastDone("Ordered");
      await load();
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmittingId(null);
    }
  }

  async function receive(e: React.FormEvent) {
    e.preventDefault();
    if (!receiving) return;
    const receipts = Object.entries(receiptQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([line_id, q]) => ({ line_id: Number(line_id), quantity: Number(q) }));
    // Guarding this one matters most: an unguarded double-click posted the same receipt twice and
    // each POST wrote its own PURCHASE_RECEIPT movement, so stock went up by twice what arrived.
    await receiveGuard.run(async () => {
      try {
        // PO-2: this writes PURCHASE_RECEIPT movements through the single write path.
        await api.post("/purchase-orders/" + receiving.id + "/receive", { receipts });
        toastDone(ACTION.receive.toast);
        setReceiving(null);
        setReceiptQty({});
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function cancel() {
    if (!cancelling) return;
    await cancelGuard.run(async () => {
      try {
        await api.post("/purchase-orders/" + cancelling.id + "/cancel");
        toastDone("Order cancelled");
        setCancelling(null);
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">{TERM.purchaseOrder}</h2>
        {canWrite ? (
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={1.75} /> New {TERM.purchaseOrder}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search by PO number..." />
      </div>

      {!data ? (
        <SkeletonRows cols={5} />
      ) : data.items.length === 0 ? (
        <EmptyState message="No incoming stock yet. Create one to bring stock in." />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th>Items</Th>
                <Th numeric>Ordered</Th>
                <Th numeric>Received</Th>
                <Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((po) => {
                const ordered = po.lines.reduce((a, l) => a + l.ordered_qty, 0);
                const received = po.lines.reduce((a, l) => a + l.received_qty, 0);
                return (
                  <Tr key={po.id}>
                    <Td mono>{po.po_number}</Td>
                    <Td>
                      <StatusChip status={po.status} />
                    </Td>
                    <Td mono>{po.lines.map((l) => sku(l.product_id)).join(", ")}</Td>
                    <Td numeric>{ordered}</Td>
                    <Td numeric>{received}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && po.status === "DRAFT" ? (
                          <Button
                            variant="ghost"
                            onClick={() => submitPo(po)}
                            disabled={submittingId === po.id}
                          >
                            {submittingId === po.id ? "Ordering..." : "Mark Ordered"}
                          </Button>
                        ) : null}
                        {canReceive && (po.status === "SUBMITTED" || po.status === "PARTIALLY_RECEIVED") ? (
                          <Button
                            variant="inbound"
                            onClick={() => {
                              setReceiving(po);
                              setReceiptQty({});
                            }}
                          >
                            <PackageCheck size={18} strokeWidth={1.75} /> {ACTION.receive.label}
                          </Button>
                        ) : null}
                        {canWrite && po.status !== "CANCELLED" && po.status !== "RECEIVED" ? (
                          <Button variant="danger" onClick={() => setCancelling(po)} aria-label="Cancel order">
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination total={data.total} page={data.page} pages={data.pages} />
        </>
      )}

      <Modal
        open={creating}
        title="New purchase order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)} disabled={createGuard.busy}>Cancel</Button>
            <Button variant="primary" form="po-form" type="submit" disabled={createGuard.busy}>
              {createGuard.busy ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form id="po-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Supplier">
            <Select
              value={draft.supplier_id}
              onChange={(e) => setDraft({ ...draft, supplier_id: e.target.value })}
              required
            >
              <option value="">Select a supplier</option>
              {suppliers?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product">
            <Select
              value={draft.product_id}
              onChange={(e) => setDraft({ ...draft, product_id: e.target.value })}
              required
            >
              <option value="">Select a product</option>
              {products?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity ordered">
            <Input
              mono
              type="number"
              min={1}
              value={draft.ordered_qty}
              onChange={(e) => setDraft({ ...draft, ordered_qty: e.target.value })}
              required
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!receiving}
        title={ACTION.receive.label + " — " + (receiving?.po_number ?? "")}
        onClose={() => setReceiving(null)}
        footer={
          <>
            <Button onClick={() => setReceiving(null)} disabled={receiveGuard.busy}>Cancel</Button>
            <Button variant="inbound" form="recv-form" type="submit" disabled={receiveGuard.busy}>
              {receiveGuard.busy ? "Recording..." : ACTION.receive.label}
            </Button>
          </>
        }
      >
        <form id="recv-form" onSubmit={receive} className="flex flex-col gap-4">
          {receiving?.lines.map((l) => (
            <Field
              key={l.id}
              label={sku(l.product_id) + " — " + l.received_qty + " of " + l.ordered_qty + " received"}
            >
              <Input
                mono
                type="number"
                min={0}
                max={l.ordered_qty - l.received_qty}
                value={receiptQty[l.id] ?? ""}
                placeholder="0"
                onChange={(e) => setReceiptQty({ ...receiptQty, [l.id]: e.target.value })}
              />
            </Field>
          ))}
          <p className="text-xs text-text-secondary">
            Status is derived from the lines — you never set it (PO-4).
          </p>
        </form>
      </Modal>

      <Modal
        open={!!cancelling}
        title={"Cancel " + TERM.purchaseOrder}
        onClose={() => setCancelling(null)}
        footer={
          <>
            <Button onClick={() => setCancelling(null)} disabled={cancelGuard.busy}>Keep order</Button>
            <Button variant="destructive" onClick={cancel} disabled={cancelGuard.busy}>
              {cancelGuard.busy ? "Cancelling..." : "Cancel order"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Cancel <span className="data">{cancelling?.po_number}</span>? It closes short — stock already
          received stays received (BR-G2).
        </p>
      </Modal>
    </div>
  );
}
