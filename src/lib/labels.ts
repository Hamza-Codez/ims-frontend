/**
 * Display labels — docs/UIUX.md §12.
 *
 * VOC-1: ONE-WAY. Codes are the API's language and are what we send and store. Everything here is
 *        rendered only — never parsed, never compared against, never sent back. There is
 *        deliberately no reverse lookup in this file; if you need one, you have a bug.
 * VOC-2: one label per concept, in nav, headers, buttons, modals, empty states and toasts alike.
 * VOC-3: this file is the only home for the map. No inline literals for a labelled concept.
 */

import type { AlertState, MovementType, OrderStatus, Role } from "@/types/api";

/** Domain nouns. */
export const TERM = {
  purchaseOrder: "Incoming Stock",
  salesOrder: "Outgoing Stock",
  stockMovement: "Stock History",
  adjustment: "Manual Correction",
  return: "Returned Stock",
  reorderPoint: "Low-Stock Level",
  sku: "Item Code",
  supplier: "Supplier",
} as const;

/** Action verbs. The button and its toast must stay in step (UIUX.md §8 + §12). */
export const ACTION = {
  receive: { label: "Receive Stock", toast: "Stock received" },
  fulfill: { label: "Send Stock", toast: "Stock sent" },
  adjust: { label: "Correct Stock", toast: "Correction saved" },
  return: { label: "Record Return", toast: "Return recorded" },
} as const;

/**
 * PO and SO share one OrderStatus enum. Their values are disjoint apart from DRAFT and CANCELLED,
 * which read identically in both, so a single map needs no context argument.
 */
const ORDER_STATUS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Ordered",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CONFIRMED: "Confirmed",
  PARTIALLY_FULFILLED: "Partially Sent",
  FULFILLED: "Completed",
  CANCELLED: "Cancelled",
};

const MOVEMENT_TYPE: Record<MovementType, string> = {
  PURCHASE_RECEIPT: "Received",
  SALE_FULFILLMENT: "Sent",
  ADJUSTMENT: TERM.adjustment,
  RETURN: TERM.return,
};

const ROLE: Record<Role, string> = {
  STOCK_CLERK: "Stock Clerk",
  PURCHASING_MANAGER: "Purchasing Manager",
  INVENTORY_ADMIN: "Inventory Admin",
  VIEWER: "Viewer",
};

const ALERT_STATE: Record<AlertState, string> = {
  OK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

/** Falls back to the raw code rather than throwing — an unlabelled value is a display gap, not an outage. */
export const orderStatusLabel = (s: OrderStatus): string => ORDER_STATUS[s] ?? s;
export const movementTypeLabel = (t: MovementType): string => MOVEMENT_TYPE[t] ?? t;
export const alertStateLabel = (a: AlertState): string => ALERT_STATE[a] ?? a;
export const roleLabel = (r: Role): string => ROLE[r] ?? r;
