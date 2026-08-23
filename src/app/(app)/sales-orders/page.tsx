"use client";

import { useEffect, useState } from "react";
import { Plus, PackageMinus, Undo2, Ban } from "lucide-react";
import { api } from "@/lib/api";
import { toastDone, toastApiError } from "@/lib/toast";
import { ACTION, TERM } from "@/lib/labels";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { StatusChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { ProductOut, SoOut } from "@/types/api";

export default function SalesOrdersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.soWrite);

  const [rows, setRows] = useState<SoOut[] | null>(null);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ customer_ref: "", product_id: "", ordered_qty: "1" });
  const [fulfilling, setFulfilling] = useState<SoOut | null>(null);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [returning, setReturning] = useState<SoOut | null>(null);
  const [returnForm, setReturnForm] = useState({ product_id: "", quantity: "1", reason: "" });
  const [cancelling, setCancelling] = useState<SoOut | null>(null);

  async function load() {
    try {
      const [so, pr] = await Promise.all([
        api.get<SoOut[]>("/sales-orders"),
        api.get<ProductOut[]>("/products"),
      ]);
      setRows(so);
      setProducts(pr);
    } catch (e) {
      toastApiError(e, "Could not load " + TERM.salesOrder + ".");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const sku = (id: number) => products.find((p) => p.id === id)?.sku ?? String(id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/sales-orders", {
        customer_ref: draft.customer_ref || null,
        lines: [{ product_id: Number(draft.product_id), ordered_qty: Number(draft.ordered_qty) }],
      });
      toastDone(TERM.salesOrder + " created");
      setCreating(false);
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function confirmSo(so: SoOut) {
    try {
      // SO-4: confirming reserves nothing. Stock is contested only at fulfillment.
      await api.post("/sales-orders/" + so.id + "/confirm");
      toastDone("Confirmed");
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function fulfill(e: React.FormEvent) {
    e.preventDefault();
    if (!fulfilling) return;
    const fulfillments = Object.entries(qty)
      .filter(([, q]) => Number(q) > 0)
      .map(([line_id, q]) => ({ line_id: Number(line_id), quantity: Number(q) }));
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
  }

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returning) return;
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
  }

  async function cancel() {
    if (!cancelling) return;
    try {
      await api.post("/sales-orders/" + cancelling.id + "/cancel");
      toastDone("Order cancelled");
      setCancelling(null);
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">{TERM.salesOrder}</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={18} strokeWidth={1.75} /> New {TERM.salesOrder}
          </Button>
        ) : null}
      </div>

      {!rows ? (
        <SkeletonRows cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState message="No outgoing stock yet. Create one to ship stock out." />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th numeric>Ordered</Th>
              <Th numeric>Sent</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((so) => {
              const ordered = so.lines.reduce((a, l) => a + l.ordered_qty, 0);
              const done = so.lines.reduce((a, l) => a + l.fulfilled_qty, 0);
              return (
                <Tr key={so.id}>
                  <Td mono>{so.so_number}</Td>
                  <Td>{so.customer_ref ?? "—"}</Td>
                  <Td>
                    <StatusChip status={so.status} />
                  </Td>
                  <Td numeric>{ordered}</Td>
                  <Td numeric>{done}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite && so.status === "DRAFT" ? (
                        <Button variant="ghost" onClick={() => confirmSo(so)}>
                          Confirm
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
      )}

      <Modal
        open={creating}
        title="New sales order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" form="so-form" type="submit">
              Create
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
              {products.map((p) => (
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
            <Button onClick={() => setFulfilling(null)}>Cancel</Button>
            <Button variant="outbound" form="ful-form" type="submit">
              {ACTION.fulfill.label}
            </Button>
          </>
        }
      >
        <form id="ful-form" onSubmit={fulfill} className="flex flex-col gap-4">
          {fulfilling?.lines.map((l) => {
            const onHand = products.find((p) => p.id === l.product_id)?.quantity_on_hand ?? 0;
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
            <Button onClick={() => setReturning(null)}>Cancel</Button>
            <Button variant="primary" form="ret-form" type="submit">
              {ACTION.return.label}
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
                  {sku(l.product_id)} — {l.fulfilled_qty} shipped
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
            <Button onClick={() => setCancelling(null)}>Keep order</Button>
            <Button variant="destructive" onClick={cancel}>
              Cancel order
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
