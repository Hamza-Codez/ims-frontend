"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StockRow, PaginatedResponse } from "@/types/api";

/** DB-1/DB-2. Read-only: alerts are derived server-side on read (AL-3), never stored. */
export function useStock(page = 1, search = "", size = 20, alertsOnly = false) {
  const [data, setData] = useState<PaginatedResponse<StockRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('size', size.toString());
      if (search) params.set('search', search);

      const endpoint = alertsOnly ? "/dashboard/alerts" : "/dashboard/stock";
      setData(await api.get<PaginatedResponse<StockRow>>(`${endpoint}?${params.toString()}`));
    } catch {
      setError("Could not load stock.");
    }
  }, [alertsOnly, page, search, size]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, reload: load };
}
