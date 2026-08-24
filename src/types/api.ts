/**
 * Types mirroring the backend contract in `docs/API.md`.
 * Per folder-structure.md these derive from the OpenAPI contract — do not invent shapes here.
 */

export type Role = "STOCK_CLERK" | "PURCHASING_MANAGER" | "INVENTORY_ADMIN" | "VIEWER";

export type AlertState = "OK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type OrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CONFIRMED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "CANCELLED";

export type MovementType = "PURCHASE_RECEIPT" | "SALE_FULFILLMENT" | "ADJUSTMENT" | "RETURN";

export interface UserOut {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface InviteCodeOut {
  id: string;
  code: string;
  role: Role;
}

/** `password` is write-only — it never appears in a response. */
export interface UserCreate {
  email: string;
  password: string;
  role: Role;
}

/** email is immutable; the password has its own action (AP-3). */
export interface UserUpdate {
  role?: Role;
  is_active?: boolean;
}

export interface PasswordSet {
  password: string;
}

export interface CategoryOut {
  id: number;
  name: string;
}

export interface SupplierOut {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface ProductOut {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  unit_of_measure: string;
  reorder_point: number;
  /** Server-derived, read-only (CAT-3). Never sent on create/update. */
  quantity_on_hand: number;
}

export interface StockRow {
  product_id: number;
  sku: string;
  name: string;
  quantity_on_hand: number;
  reorder_point: number;
  alert_state: AlertState;
}

export interface MovementOut {
  id: number;
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  reason?: string | null;
  /** Running balance after this movement. */
  new_quantity_on_hand: number;
  source: {
    po_line_id?: number | null;
    so_line_id?: number | null;
    sales_order_id?: number | null;
  };
}

export interface ReturnOut {
  id: number;
  quantity: number;
  reason: string | null;
  created_at: string;
  product: {
    id: number;
    sku: string;
    name: string;
  };
  sales_order: {
    id: number;
    so_number: string;
    customer_ref: string | null;
  };
}

export interface PoLine {
  id: number;
  product_id: number;
  ordered_qty: number;
  received_qty: number;
}

export interface PoOut {
  id: number;
  po_number: string;
  supplier_id: number;
  status: OrderStatus;
  lines: PoLine[];
}

export interface SoLine {
  id: number;
  product_id: number;
  ordered_qty: number;
  fulfilled_qty: number;
  returned_qty: number;
}

export interface SoOut {
  id: number;
  so_number: string;
  customer_ref?: string | null;
  status: OrderStatus;
  lines: SoLine[];
}

/** API.md §Error Envelope. `code` is the machine code on business-rule violations. */
export interface ErrorEnvelope {
  error: "auth" | "forbidden" | "not_found" | "business_rule" | "internal";
  code?: string;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
