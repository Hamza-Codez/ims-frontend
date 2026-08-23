"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PackageCheck, PackageMinus, SlidersHorizontal, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { TERM, movementTypeLabel } from "@/lib/labels";
import { toastApiError } from "@/lib/toast";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import type { MovementOut, MovementType, ProductOut } from "@/types/api";

/** §2 direction tokens. Coloured by the SIGN of the movement rather than per type, because that
 *  is what "direction" actually means here — an adjustment can go either way. The icon and the
 *  explicit +/- carry the same information, so colour is never the only cue. */
function directionClass(quantity: number): string {
  return quantity > 0 ? "text-inbound" : "text-outbound";
}

function MovementIcon({ type, quantity }: { type: MovementType; quantity: number }) {
  const props = {
    size: 16,
    strokeWidth: 1.75,
    "aria-hidden": true,
    className: directionClass(quantity),
  } as const;
  if (type === "PURCHASE_RECEIPT") return <PackageCheck {...props} />;
  if (type === "SALE_FULFILLMENT") return <PackageMinus {...props} />;
  if (type === "RETURN") return <Undo2 {...props} />;
  return <SlidersHorizontal {...props} />;
}

/** VOC-2: the source column uses the same words as the rest of the interface, not PO/SO shorthand. */
function sourceLabel(m: MovementOut): string {
  if (m.source?.po_line_id) return TERM.purchaseOrder + " line " + m.source.po_line_id;
  if (m.source?.so_line_id) return TERM.salesOrder + " line " + m.source.so_line_id;
  if (m.source?.sales_order_id) return TERM.salesOrder + " " + m.source.sales_order_id;
  return "—";
}

export default function ProductLedgerPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [product, setProduct] = useState<ProductOut | null>(null);
  const [movements, setMovements] = useState<MovementOut[] | null>(null);

  useEffect(() => {
    // DB-3/DB-4: read-only, no lock, newest first. This view never toasts (§8).
    Promise.all([
      api.get<ProductOut>("/products/" + productId),
      api.get<MovementOut[]>("/products/" + productId + "/movements"),
    ])
      .then(([p, m]) => {
        setProduct(p);
        setMovements(m);
      })
      .catch((e) => {
        toastApiError(e, "Could not load " + TERM.stockMovement + ".");
        setMovements([]);
      });
  }, [productId]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/inventory" className="text-xs text-text-secondary underline-offset-2 hover:underline">
          Inventory
        </Link>
        <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">
          {product ? product.name : TERM.stockMovement}
        </h2>
        {product ? (
          <p className="mt-1 text-sm text-text-secondary">
            <span className="data">{product.sku}</span> · on hand{" "}
            <span className="data">{product.quantity_on_hand}</span> {product.unit_of_measure}
          </p>
        ) : null}
      </div>

      <p className="text-sm text-text-secondary">
        Every row is immutable. A correction is a new movement, never an edit.
      </p>

      {!movements ? (
        <SkeletonRows cols={6} />
      ) : movements.length === 0 ? (
        <EmptyState message="No movements yet. Receive stock or record an adjustment to start the ledger." />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th numeric>ID</Th>
              <Th>Type</Th>
              <Th numeric>Change</Th>
              <Th numeric>Balance after</Th>
              <Th>Source</Th>
              <Th>Reason</Th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <Tr key={m.id}>
                <Td numeric>{m.id}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <MovementIcon type={m.movement_type} quantity={m.quantity} />
                    {movementTypeLabel(m.movement_type)}
                  </span>
                </Td>
                {/* The sign is spelled out as well as coloured — colour is never the only cue. */}
                <Td numeric>
                  <span className={directionClass(m.quantity)}>
                    {m.quantity > 0 ? "+" + m.quantity : m.quantity}
                  </span>
                </Td>
                <Td numeric>{m.new_quantity_on_hand}</Td>
                <Td mono>{sourceLabel(m)}</Td>
                <Td>{m.reason ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
