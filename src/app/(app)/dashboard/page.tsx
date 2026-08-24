"use client";

import Link from "next/link";
import { useStock } from "@/features/inventory/useStock";
import { useDashboardMetrics } from "@/features/inventory/useDashboardMetrics";
import { useSearchParams } from "next/navigation";
import { TERM } from "@/lib/labels";
import { AlertChip } from "@/components/StatusChip";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { Pagination } from "@/components/Pagination";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const alertsPage = parseInt(searchParams.get('alertsPage') || '1');
  const stockPage = parseInt(searchParams.get('stockPage') || '1');

  const { data: metrics } = useDashboardMetrics();
  const { data: alertsData } = useStock(alertsPage, "", 10, true);
  const { data: stockData } = useStock(stockPage, "", 20, false);

  if (!metrics || !alertsData || !stockData) return <SkeletonRows cols={5} />;

  return (
    <div className="flex flex-col gap-6">
      {/* Counters are data, so they are mono + tabular like everything else (§3). */}
      <section className="grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-3">
        {[
          { label: "Products tracked", value: metrics.products_tracked },
          { label: "Low stock", value: metrics.low_stock },
          { label: "Out of stock", value: metrics.out_of_stock },
        ].map((s) => (
          <div key={s.label} className="bg-gradient-to-br from-black to-zinc-700 text-white px-4 py-3">
            <div className="eyebrow !text-on-chrome-muted">{s.label}</div>
            <div className="data mt-1 text-2xl">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[18px] font-semibold leading-tight">Needs attention</h2>
        {alertsData.items.length === 0 ? (
          <div className="border-l-2 border-l-ink text-black bg-gradient-to-br from-zinc-750 to-accent px-4 py-3">
            Nothing below its reorder point. Stock levels are healthy.
          </div>
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
              </tr>
            </thead>
            <tbody>
              {alertsData.items.map((r) => (
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
          <Pagination 
            total={alertsData.total} 
            page={alertsData.page} 
            pages={alertsData.pages} 
            paramName="alertsPage" 
          />
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[18px] font-semibold leading-tight">All stock</h2>
        {stockData.items.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {stockData.items.map((r) => (
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
          <Pagination 
            total={stockData.total} 
            page={stockData.page} 
            pages={stockData.pages} 
            paramName="stockPage" 
          />
          </>
        )}
      </section>
    </div>
  );
}
