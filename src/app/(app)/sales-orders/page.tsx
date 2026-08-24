"use client";

import { useEffect, useState } from "react";
import { Plus, PackageMinus, Undo2, Ban } from "lucide-react";
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
import type { ProductOut, SoOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "next/navigation";

export default function SalesOrdersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.soWrite);

  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<SoOut> | null>(null);
  const [products, setProducts] = useState<PaginatedResponse<ProductOut> | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ customer_ref: "", product_id: "", ordered_qty: "1" });
  const [fulfilling, setFulfilling] = useState<SoOut | null>(null);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [returning, setReturning] = useState<SoOut | null>(null);
  const [returnForm, setReturnForm] = useState({ product_id: "", quantity: "1", reason: "" });
  const [cancelling, setCancelling] = useState<SoOut | null>(null);

  // One guard per action so they cannot disable each other.
  const createGuard = useSubmit();
  const fulfillGuard = useSubmit();
  const returnGuard = useSubmit();
  const cancelGuard = useSubmit();
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  // Regenerated each time the form opens: a retry of THIS order replays onto the one the first
  // attempt created, while a genuinely new order gets its own key.
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

      setData(await api.get<PaginatedResponse<SoOut>>(`/sales-orders?${params.toString()}`));
    } catch (e) {
      toastApiError(e, "Could not load " + TERM.salesOrder + ".");
    }
  }

  // Reference data for the dropdowns: loaded once, not on every reload after every mutation.
  // `size`, not `limit` — the API takes page/size, so `limit=1000` was ignored and this select
  // only ever held the first 20 products.
  async function loadReferenceData() {
    try {
      setProducts(await api.get<PaginatedResponse<ProductOut>>("/products?size=1000"));
    } catch (e) {
      toastApiError(e, "Could not load products.");
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
          "/sales-orders",
          {
            customer_ref: draft.customer_ref || null,
            lines: [{ product_id: Number(draft.product_id), ordered_qty: Number(draft.ordered_qty) }],
          },
          createKey,
        );
        toastDone(TERM.salesOrder + " created");
        setCreating(false);
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function confirmSo(so: SoOut) {
    // Per-row guard: disables only the button that was pressed.
    if (busyRowId !== null) return;
    setBusyRowId(so.id);
    try {
      // SO-4: confirming reserves nothing. Stock is contested only at fulfillment.
      await api.post("/sales-orders/" + so.id + "/confirm");
      toastDone("Confirmed");
      await load();
    } catch (e) {
      toastApiError(e);
    } finally {
      setBusyRowId(null);
    }
  }

  async function fulfill(e: React.FormEvent) {
    e.preventDefault();
    if (!fulfilling) return;
    const fulfillments = Object.entries(qty)
      .filter(([, q]) => Number(q) > 0)
      .map(([line_id, q]) => ({ line_id: Number(line_id), quantity: Number(q) }));
    // Unguarded, a double-click posted the same fulfillment twice and each POST wrote its own
    // SALE_FULFILLMENT movement — stock went down by twice what shipped.
    await fulfillGuard.run(async () => {
      try {
        // SO-3: an oversell comes back as 409 OVERSELL and is surfaced verbatim by toastApiError.
        await api.post("/sales-orders/" + fulfilling.id + "/fulfill", { fulfillments });
        toastDone(ACTION.fulfill.toast);
        setFulfilling(null);
        setQty({});
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returning) return;
    // Same exposure as fulfill, in the other direction: two clicks would return the goods twice.
    await returnGuard.run(async () => {
      try {
        await api.post("/sales-orders/" + returning.id + "/returns", {
          items: [
            {
              product_id: Number(returnForm.product_id),
              quantity: Number(returnForm.quantity),
              reason: returnForm.reason || null,
            },
          ],
        });
        toastDone(ACTION.return.toast);
        setReturning(null);
        setReturnForm({ product_id: "", quantity: "1", reason: "" });
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
        await api.post("/sales-orders/" + cancelling.id + "/cancel");
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
        <h2 className="text-[18px] font-semibold leading-tight">{TERM.salesOrder}</h2>
        {canWrite ? (
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={1.75} /> New {TERM.salesOrder}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SearchBar placeholder="Search by SO number or customer..." />
      </div>

      {!data ? (
        <SkeletonRows cols={5} />
      ) : data.items.length === 0 ? (
        <EmptyState message="No outgoing stock yet. Create one to ship stock out." />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th numeric>Ordered</Th>
                <Th numeric>Sent</Th>
                <Th numeric>Returned</Th>
                <Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((so) => {
                const ordered = so.lines.reduce((a, l) => a + l.ordered_qty, 0);
                const done = so.lines.reduce((a, l) => a + l.fulfilled_qty, 0);
                const returned = so.lines.reduce((a, l) => a + l.returned_qty, 0);
                return (
                  <Tr key={so.id}>
                    <Td mono>{so.so_number}</Td>
                    <Td>{so.customer_ref ?? "—"}</Td>
                    <Td>
                      <StatusChip status={so.status} />
                    </Td>
                    <Td numeric>{ordered}</Td>
                    <Td numeric>{done}</Td>
                    <Td numeric>{returned}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && so.status === "DRAFT" ? (
                          <Button
                            variant="ghost"
                            onClick={() => confirmSo(so)}
                            disabled={busyRowId === so.id}
                          >
                            {busyRowId === so.id ? "Confirming..." : "Confirm"}
                          </Button>
                        ) : null}
                        {canWrite && (so.status === "CONFIRMED" || so.status === "PARTIALLY_FULFILLED") ? (
                          <Button
                            variant="outbound"
                            onClick={() => {
                              setFulfilling(so);
                              setQty({});
                            }}
                          >
                            <PackageMinus size={18} strokeWidth={1.75} /> {ACTION.fulfill.label}
                          </Button>
                        ) : null}
                        {canWrite && done > 0 ? (
                          <Button variant="ghost" onClick={() => setReturning(so)} aria-label={ACTION.return.label}>
                            <Undo2 size={18} strokeWidth={1.75} /> {ACTION.return.label}
                          </Button>
                        ) : null}
                        {canWrite && so.status !== "CANCELLED" && so.status !== "FULFILLED" ? (
                          <Button variant="danger" onClick={() => setCancelling(so)} aria-label="Cancel order">
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
        title="New sales order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)} disabled={createGuard.busy}>Cancel</Button>
            <Button variant="primary" form="so-form" type="submit" disabled={createGuard.busy}>
              {createGuard.busy ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form id="so-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Customer reference">
            <Input
              value={draft.customer_ref}
              onChange={(e) => setDraft({ ...draft, customer_ref: e.target.value })}
            />
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
                  {p.sku} — {p.name} ({p.quantity_on_hand} on hand)
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
        open={!!fulfilling}
        title={ACTION.fulfill.label + " — " + (fulfilling?.so_number ?? "")}
        onClose={() => setFulfilling(null)}
        footer={
          <>
            <Button onClick={() => setFulfilling(null)} disabled={fulfillGuard.busy}>Cancel</Button>
            <Button variant="outbound" form="ful-form" type="submit" disabled={fulfillGuard.busy}>
              {fulfillGuard.busy ? "Recording..." : ACTION.fulfill.label}
            </Button>
          </>
        }
      >
        <form id="ful-form" onSubmit={fulfill} className="flex flex-col gap-4">
          {fulfilling?.lines.map((l) => {
            const onHand = products?.items.find((p) => p.id === l.product_id)?.quantity_on_hand ?? 0;
            return (
              <Field
                key={l.id}
                label={sku(l.product_id) + " — " + l.fulfilled_qty + " of " + l.ordered_qty + " fulfilled"}
                hint={onHand + " on hand"}
              >
                <Input
                  mono
                  type="number"
                  min={0}
                  value={qty[l.id] ?? ""}
                  placeholder="0"
                  onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                />
              </Field>
            );
          })}
          <p className="text-xs text-text-secondary">
            Stock is checked at fulfillment, not at confirmation (SO-4). An oversell is rejected outright.
          </p>
        </form>
      </Modal>

      <Modal
        open={!!returning}
        title={ACTION.return.label + " — " + (returning?.so_number ?? "")}
        onClose={() => setReturning(null)}
        footer={
          <>
            <Button onClick={() => setReturning(null)} disabled={returnGuard.busy}>Cancel</Button>
            <Button variant="primary" form="ret-form" type="submit" disabled={returnGuard.busy}>
              {returnGuard.busy ? "Recording..." : ACTION.return.label}
            </Button>
          </>
        }
      >
        <form id="ret-form" onSubmit={submitReturn} className="flex flex-col gap-4">
          <Field label="Product">
            <Select
              value={returnForm.product_id}
              onChange={(e) => setReturnForm({ ...returnForm, product_id: e.target.value })}
              required
            >
              <option value="">Select a product</option>
              {returning?.lines.map((l) => (
                <option key={l.id} value={l.product_id}>
                  {sku(l.product_id)} — {l.fulfilled_qty - l.returned_qty} shipped (net)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" hint="Cannot exceed the net quantity shipped on this order (RET-3).">
            <Input
              mono
              type="number"
              min={1}
              value={returnForm.quantity}
              onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
              required
            />
          </Field>
          <Field label="Reason">
            <Input
              value={returnForm.reason}
              onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!cancelling}
        title={"Cancel " + TERM.salesOrder}
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
          Cancel <span className="data">{cancelling?.so_number}</span>? It closes short — anything already
          shipped stays shipped (BR-G2).
        </p>
      </Modal>
    </div>
  );
}
