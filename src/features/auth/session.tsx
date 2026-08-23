"use client";

/** Client-side session context. Guarding here is UX only — the backend is authoritative (AZ-3). */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Role, UserOut } from "@/types/api";

interface SessionValue {
  user: UserOut | null;
  loading: boolean;
  setupRequired: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
}

const SessionContext = createContext<SessionValue>({
  user: null,
  loading: true,
  setupRequired: false,
  refresh: async () => {},
  clear: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // Fetch both user status and setup status concurrently
      const [userRes, setupRes] = await Promise.allSettled([
        api.get<UserOut>("/auth/me"),
        api.get<{ setup_required: boolean }>("/auth/setup-status"),
      ]);
      
      if (setupRes.status === "fulfilled") {
        setSetupRequired(setupRes.value.setup_required);
      }
      
      if (userRes.status === "fulfilled") {
        setUser(userRes.value);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, setupRequired, refresh, clear: () => setUser(null) }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/** Mirrors docs/AUTHORIZATION.md. UX only: it hides controls the backend would 403 anyway. */
export const CAN = {
  userAdmin: ["INVENTORY_ADMIN"],
  catalogWrite: ["INVENTORY_ADMIN"],
  supplierWrite: ["PURCHASING_MANAGER", "INVENTORY_ADMIN"],
  poWrite: ["PURCHASING_MANAGER", "INVENTORY_ADMIN"],
  poReceive: ["STOCK_CLERK", "PURCHASING_MANAGER", "INVENTORY_ADMIN"],
  soWrite: ["STOCK_CLERK", "INVENTORY_ADMIN"],
  inventoryWrite: ["STOCK_CLERK", "INVENTORY_ADMIN"],
} satisfies Record<string, Role[]>;

export function allowed(role: Role | undefined, roles: readonly Role[]): boolean {
  return !!role && roles.includes(role);
}
