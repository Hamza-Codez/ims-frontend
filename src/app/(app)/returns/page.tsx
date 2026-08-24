"use client";

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { toastApiError } from "@/lib/toast";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { Pagination } from "@/components/Pagination";
import type { PaginatedResponse, ReturnOut } from "@/types/api";

export default function ReturnsPage() {
  const [data, setData] = useState<PaginatedResponse<ReturnOut> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function load() {
    try {
      const res = await api.get<PaginatedResponse<ReturnOut>>(`/returns?page=${currentPage}`);
      setData(res);
    } catch (e) {
      toastApiError(e, "Could not load returns.");
    }
  }

  useEffect(() => {
    void load();
  }, [currentPage]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Returns</h2>
      </div>

      <p className="text-sm text-text-secondary">
        A complete log of all products returned from Sales Orders.
      </p>

      {!data ? (
        <SkeletonRows cols={6} />
      ) : data.items.length === 0 ? (
        <EmptyState message="No returned products yet." />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Sales Order</Th>
                <Th>Customer Ref</Th>
                <Th>Product</Th>
                <Th numeric>Quantity</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((ret) => (
                <Tr key={ret.id}>
                  <Td>{new Date(ret.created_at).toLocaleDateString()}</Td>
                  <Td mono>{ret.sales_order.so_number}</Td>
                  <Td>{ret.sales_order.customer_ref || "—"}</Td>
                  <Td>
                    <span className="font-mono text-text-secondary mr-2">{ret.product.sku}</span>
                    {ret.product.name}
                  </Td>
                  <Td numeric className="font-mono font-medium text-inbound">
                    +{ret.quantity}
                  </Td>
                  <Td>{ret.reason || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            total={data.total}
            page={data.page}
            pages={data.pages}
          />
        </>
      )}
    </div>
  );
}
