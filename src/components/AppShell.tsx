"use client";

/** UIUX.md §5 — 248px DARK sidebar (`chrome`) and 56px dark topbar; the content area stays white.
 *  Outlet padded 24 (16 on mobile). Sidebar becomes an off-canvas drawer below 1024px. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Package, Tags, Truck, ClipboardList, ShoppingCart,
  ScrollText, CircleUser, LogOut, Menu, X, Users, Layers, Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import { TERM, roleLabel } from "@/lib/labels";
import { CAN, allowed, useSession } from "@/features/auth/session";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/categories", label: "Categories", Icon: Tags },
  { href: "/suppliers", label: "Suppliers", Icon: Truck },
  { href: "/purchase-orders", label: TERM.purchaseOrder, Icon: ClipboardList },
  { href: "/sales-orders", label: TERM.salesOrder, Icon: ShoppingCart },
  { href: "/returns", label: "Returns", Icon: Undo2 },
  { href: "/inventory", label: "Inventory", Icon: ScrollText },
];

// Admin-only nav. AZ-3: hiding it is UX; /users is guarded to INVENTORY_ADMIN server-side.
const ADMIN_NAV = [{ href: "/users", label: "Users", Icon: Users }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, clear } = useSession();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  const items = allowed(user?.role, CAN.userAdmin) ? [...NAV, ...ADMIN_NAV] : NAV;

  const nav = (
    <nav className="flex flex-col gap-0.5 p-2">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setDrawer(false)}
            // §5: active = amber 3px LEFT indicator + accent-wash bg + ink text. Never amber text.
            className={[
              "flex items-center gap-2.5 border-l-[3px] px-3 py-2 text-sm transition-colors duration-150 ease-out",
              active
                ? "border-accent bg-chrome-raised font-medium text-on-chrome"
                : "border-transparent text-on-chrome-muted hover:bg-chrome-raised hover:text-on-chrome",
            ].join(" ")}
          >
            {/* Amber is legible on chrome (~8:1) — permitted here and nowhere on white. */}
            <Icon
              size={18}
              strokeWidth={1.75}
              aria-hidden
              className={active ? "text-accent" : ""}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const title = [...NAV, ...ADMIN_NAV].find((n) => pathname.startsWith(n.href))?.label ?? "Inventory";

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clear();
      router.push("/login");
    }
  }

  const userProfile = (
    <div className="border-t border-chrome-hairline p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs text-on-chrome-muted">
          <CircleUser size={18} strokeWidth={1.75} className="shrink-0 text-on-chrome-muted" aria-hidden />
          <div className="flex min-w-0 flex-col overflow-hidden">
            <span className="data truncate text-on-chrome">{user?.email}</span>
            <span className="eyebrow truncate !text-on-chrome-muted">{user?.role.replace(/_/g, " ")}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 text-sm font-medium text-on-chrome-muted transition-colors hover:text-on-chrome"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-bg">
      <aside className="hidden w-[248px] shrink-0 flex-col bg-chrome lg:flex">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-chrome-hairline px-4">
          <img src="/assets/brand_logo.png" alt="Brand Logo" className="h-8 object-contain" />
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {userProfile}
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[248px] flex-col bg-chrome">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-chrome-hairline px-4">
              <div className="flex items-center gap-2">
                <img src="/assets/brand_logo.png" alt="Brand Logo" className="h-8 object-contain" />
              </div>
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="text-on-chrome">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {userProfile}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 bg-accent px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="text-ink lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu size={18} strokeWidth={1.75} />
            </button>
            <h1 className="text-lg font-bold text-ink">{title}</h1>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
