"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface DashboardMetricsData {
  products_tracked: number;
  low_stock: number;
  out_of_stock: number;
}

export function useDashboardMetrics() {
  const [data, setData] = useState<DashboardMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<DashboardMetricsData>("/dashboard/metrics"));
    } catch {
      setError("Could not load metrics.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, reload: load };
}
