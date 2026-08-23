"use client";

import Link from "next/link";
import { useStock } from "@/features/inventory/useStock";
import { TERM } from "@/lib/labels";
import { AlertChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";

export default function DashboardPage() {
  const { rows, error } = useStock();

  if (error) return <EmptyState message={error} />;
  if (!rows) return <SkeletonRows cols={5} />;

  const alerts = rows.filter((r) => r.alert_state !== "OK");
  const out = alerts.filter((r) => r.alert_state === "OUT_OF_STOCK").length;
  const low = alerts.filter((r) => r.alert_state === "LOW_STOCK").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Counters are data, so they are mono + tabular like everything else (§3). */}
      <section className="grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-3">
        {[
          { label: "Products tracked", value: rows.length },
          { label: "Low stock", value: low },
          { label: "Out of stock", value: out },
        ].map((s) => (
          <div key={s.label} className="bg-gradient-to-br from-black to-zinc-700 text-white px-4 py-3">
            <div className="eyebrow !text-on-chrome-muted">{s.label}</div>
            <div className="data mt-1 text-2xl">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[18px] font-semibold leading-tight">Needs attention</h2>
        {alerts.length === 0 ? (
          <div className="border-l-2 border-l-ink text-black bg-gradient-to-br from-zinc-750 to-accent px-4 py-3">
            Nothing below its reorder point. Stock levels are healthy.
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{TERM.sku}</Th>
                <Th>Product</Th>
                <Th numeric>On hand</Th>
                <Th numeric>{TERM.reorderPoint}</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((r) => (
                <Tr key={r.product_id}>
                  <Td mono>
                    <Link href={`/inventory/${r.product_id}`} className="underline-offset-2 hover:underline">
                      {r.sku}
                    </Link>
                  </Td>
                  <Td>{r.name}</Td>
                  <Td numeric>{r.quantity_on_hand}</Td>
                  <Td numeric>{r.reorder_point}</Td>
                  <Td><AlertChip state={r.alert_state} /></Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[18px] font-semibold leading-tight">All stock</h2>
        {rows.length === 0 ? (
          <EmptyState message="No products yet. Add your first product." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{TERM.sku}</Th>
                <Th>Product</Th>
                <Th numeric>On hand</Th>
                <Th numeric>{TERM.reorderPoint}</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.product_id}>
                  <Td mono>
                    <Link href={`/inventory/${r.product_id}`} className="underline-offset-2 hover:underline">
                      {r.sku}
                    </Link>
                  </Td>
                  <Td>{r.name}</Td>
                  <Td numeric>{r.quantity_on_hand}</Td>
                  <Td numeric>{r.reorder_point}</Td>
                  <Td><AlertChip state={r.alert_state} /></Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>
    </div>
  );
}
