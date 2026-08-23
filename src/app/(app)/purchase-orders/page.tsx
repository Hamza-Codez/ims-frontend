"use client";

import { useEffect, useState } from "react";
import { Plus, PackageCheck, Ban } from "lucide-react";
import { api } from "@/lib/api";
import { toastDone, toastApiError } from "@/lib/toast";
import { ACTION, TERM } from "@/lib/labels";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { StatusChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { PoOut, ProductOut, SupplierOut } from "@/types/api";

export default function PurchaseOrdersPage() {
  const { user } = useSession();
  const canWrite = allowed(user?.role, CAN.poWrite);
  const canReceive = allowed(user?.role, CAN.poReceive);

  const [rows, setRows] = useState<PoOut[] | null>(null);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ supplier_id: "", product_id: "", ordered_qty: "1" });
  const [receiving, setReceiving] = useState<PoOut | null>(null);
  const [receiptQty, setReceiptQty] = useState<Record<number, string>>({});
  const [cancelling, setCancelling] = useState<PoOut | null>(null);

  async function load() {
    try {
      const [po, pr, su] = await Promise.all([
        api.get<PoOut[]>("/purchase-orders"),
        api.get<ProductOut[]>("/products"),
        api.get<SupplierOut[]>("/suppliers"),
      ]);
      setRows(po);
      setProducts(pr);
      setSuppliers(su);
    } catch (e) {
      toastApiError(e, "Could not load " + TERM.purchaseOrder + ".");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const sku = (id: number) => products.find((p) => p.id === id)?.sku ?? String(id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/purchase-orders", {
        supplier_id: Number(draft.supplier_id),
        lines: [{ product_id: Number(draft.product_id), ordered_qty: Number(draft.ordered_qty) }],
      });
      toastDone(TERM.purchaseOrder + " created");
      setCreating(false);
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function submitPo(po: PoOut) {
    try {
      await api.post("/purchase-orders/" + po.id + "/submit");
      toastDone("Ordered");
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function receive(e: React.FormEvent) {
    e.preventDefault();
    if (!receiving) return;
    const receipts = Object.entries(receiptQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([line_id, q]) => ({ line_id: Number(line_id), quantity: Number(q) }));
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
  }

  async function cancel() {
    if (!cancelling) return;
    try {
      await api.post("/purchase-orders/" + cancelling.id + "/cancel");
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
        <h2 className="text-[18px] font-semibold leading-tight">{TERM.purchaseOrder}</h2>
        {canWrite ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={18} strokeWidth={1.75} /> New {TERM.purchaseOrder}
          </Button>
        ) : null}
      </div>

      {!rows ? (
        <SkeletonRows cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState message="No incoming stock yet. Create one to bring stock in." />
      ) : (
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
            {rows.map((po) => {
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
                        <Button variant="ghost" onClick={() => submitPo(po)}>
                          Mark Ordered
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
      )}

      <Modal
        open={creating}
        title="New purchase order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" form="po-form" type="submit">
              Create
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
              {suppliers.map((s) => (
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
              {products.map((p) => (
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
            <Button onClick={() => setReceiving(null)}>Cancel</Button>
            <Button variant="inbound" form="recv-form" type="submit">
              {ACTION.receive.label}
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
            <Button onClick={() => setCancelling(null)}>Keep order</Button>
            <Button variant="destructive" onClick={cancel}>
              Cancel order
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
