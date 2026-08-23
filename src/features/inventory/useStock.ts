"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StockRow } from "@/types/api";

/** DB-1/DB-2. Read-only: alerts are derived server-side on read (AL-3), never stored. */
export function useStock(alertsOnly = false) {
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.get<StockRow[]>(alertsOnly ? "/dashboard/alerts" : "/dashboard/stock"));
    } catch {
      setError("Could not load stock.");
    }
  }, [alertsOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, error, reload: load };
}
