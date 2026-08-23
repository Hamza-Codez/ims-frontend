/** UIUX.md §2 — status -> treatment. Small, quiet, never the loudest thing on screen. */
import { AlertTriangle, PackageX } from "lucide-react";
import type { AlertState, OrderStatus } from "@/types/api";
import { alertStateLabel, orderStatusLabel } from "@/lib/labels";

const CHIP = "inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function AlertChip({ state }: { state: AlertState }) {
  // §2 + §12: OK stays chip-less so the rows that need attention stand out. The label is still
  // available to assistive tech via the caller's aria-label; it is not printed on every row.
  if (state === "OK") return null;
  if (state === "OUT_OF_STOCK") {
    // inverse: ink fill + white text
    return (
      <span className={CHIP + " bg-ink text-white"}>
        <PackageX size={14} strokeWidth={1.75} aria-hidden />
        {alertStateLabel(state)}
      </span>
    );
  }
  return (
    <span className={CHIP + " border-l-2 border-accent bg-accent-wash text-ink"}>
      <AlertTriangle size={14} strokeWidth={1.75} aria-hidden />
      {alertStateLabel(state)}
    </span>
  );
}

export function StatusChip({ status }: { status: OrderStatus }) {
  const label = orderStatusLabel(status);
  let bgClass = "bg-ink";

  switch (status) {
    case "RECEIVED":
    case "FULFILLED":
      bgClass = "bg-emerald-900/90"; // Deep Jade
      break;
    case "PARTIALLY_RECEIVED":
    case "PARTIALLY_FULFILLED":
      bgClass = "bg-orange-900/90"; // Deep Orange
      break;
    case "CANCELLED":
      bgClass = "bg-danger line-through"; // Danger
      break;
    case "CONFIRMED":
    case "SUBMITTED":
      bgClass = "bg-accent-hover/80"; // Dark accent
      break;
    case "DRAFT":
      bgClass = "bg-ink/80"; // Black
      break;
  }

  return <span className={`${CHIP} ${bgClass} text-white`}>{label}</span>;
}
