import { SHIPPING_METHOD_INFO, type ShippingMethod } from "@/lib/checkout";

/** StoreOrder statuses (CLAUDE.md §6), in dashboard display order. */
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKAGING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
  "FAILED",
] as const;
export type OrderStatusKey = (typeof ORDER_STATUSES)[number];

export const noOrders = () => Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatusKey, number>;

// ── Order display helpers (client-safe) — shared by the confirmation page and the invoice PDF ──

type AddressRow = {
  name: string;
  phone: string;
  email: string;
  address: string;
  address2: string | null;
  city: string;
  state: string | null;
  zip: string;
  country: string;
};

type OrderAddresses = {
  shipName: string; shipPhone: string; shipEmail: string; shipAddress: string; shipAddress2: string | null; shipCity: string; shipState: string | null; shipZip: string; shipCountry: string;
  billingSameAsShipping: boolean;
  billName: string | null; billPhone: string | null; billEmail: string | null; billAddress: string | null; billAddress2: string | null; billCity: string | null; billState: string | null; billZip: string | null; billCountry: string | null;
};

/** The order's shipping or billing address (billing falls back to shipping when "same as shipping"). */
export function orderAddress(o: OrderAddresses, which: "ship" | "bill"): AddressRow {
  if (which === "bill" && !o.billingSameAsShipping && o.billName) {
    return { name: o.billName, phone: o.billPhone ?? "", email: o.billEmail ?? "", address: o.billAddress ?? "", address2: o.billAddress2, city: o.billCity ?? "", state: o.billState, zip: o.billZip ?? "", country: o.billCountry ?? "" };
  }
  return { name: o.shipName, phone: o.shipPhone, email: o.shipEmail, address: o.shipAddress, address2: o.shipAddress2, city: o.shipCity, state: o.shipState, zip: o.shipZip, country: o.shipCountry };
}

/** Postal lines: "1 Landmark Square, Apt 4B" · "Stamford, CT 06901" · "United States". */
export function addressLines(a: AddressRow): string[] {
  return [[a.address, a.address2].filter(Boolean).join(", "), `${a.city}${a.state ? `, ${a.state}` : ""} ${a.zip}`.trim(), a.country];
}

export const PAYMENT_METHOD_LABEL = { COD: "Cash on Delivery", STRIPE: "Card (Stripe)" } as const;
export const PAYMENT_STATUS_LABEL = { UNPAID: "Unpaid", PAID: "Paid", REFUNDED: "Refunded" } as const;
/** Payment status → Badge tone. */
export const PAYMENT_STATUS_TONE = { PAID: "success", UNPAID: "warning", REFUNDED: "error" } as const;
/** The reports' payment wording (vendortransactionreport design): Completed / Pending / Refunded. */
export const PAYMENT_REPORT_LABEL = { PAID: "Completed", UNPAID: "Pending", REFUNDED: "Refunded" } as const;
export const ORDER_STATUS_LABEL: Record<OrderStatusKey, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  FAILED: "Failed to deliver",
  CANCELED: "Canceled",
};

/**
 * Seller Center wording of a status filter (vendororderlist design: sidebar, list title). FAILED is the
 * enum value behind "Failed to Deliver".
 */
export const orderFilterLabel = (s: OrderStatusKey) =>
  s === "OUT_FOR_DELIVERY" ? "Out for Delivery" : s === "FAILED" ? "Failed to Deliver" : ORDER_STATUS_LABEL[s];

export const invoiceHref = (orderNumber: number) => `/api/orders/${orderNumber}/invoice`;
export const orderDate = (d: Date | string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

/** DESIGN_SYSTEM §6 status map → Badge tone. */
export const ORDER_STATUS_TONE: Record<OrderStatusKey, "info" | "primary" | "warning" | "success" | "neutral" | "error"> = {
  PENDING: "info",
  CONFIRMED: "primary",
  PACKAGING: "warning",
  OUT_FOR_DELIVERY: "primary",
  DELIVERED: "success",
  RETURNED: "neutral",
  FAILED: "error",
  CANCELED: "error",
};

// ── Customer order list (userOrder design) ──────────────────────────────────────────────────────

/** Fulfilment progress of a StoreOrder; RETURNED / FAILED / CANCELED are end states off this line. */
const PROGRESS: OrderStatusKey[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY", "DELIVERED"];

/**
 * One status for an order split across sellers: the least advanced of its live seller parts (so "Out
 * for delivery" only shows once every seller has shipped). Canceled parts are ignored; an order whose
 * parts are all canceled is CANCELED. Parts that all ended RETURNED / FAILED report that.
 */
export function customerOrderStatus(storeStatuses: OrderStatusKey[]): OrderStatusKey {
  const live = storeStatuses.filter((s) => s !== "CANCELED");
  if (live.length === 0) return "CANCELED";
  const moving = live.filter((s) => PROGRESS.includes(s));
  if (moving.length === 0) return live.includes("FAILED") ? "FAILED" : "RETURNED";
  return moving.reduce((min, s) => (PROGRESS.indexOf(s) < PROGRESS.indexOf(min) ? s : min));
}

/**
 * "2 of 3 delivered" when an order's sellers are at different steps: the badge shows the least
 * advanced part, so this says how far the rest got. Only parts still on the delivery line count
 * (canceled / returned / failed ones are left out); null when they're all at the same step.
 */
export function orderProgressNote(storeStatuses: OrderStatusKey[]): string | null {
  const moving = storeStatuses.filter((s) => PROGRESS.includes(s));
  const n = moving.length;
  if (n < 2) return null;
  const steps: [OrderStatusKey, string][] = [
    ["DELIVERED", "delivered"],
    ["OUT_FOR_DELIVERY", "shipped"],
    ["PACKAGING", "packed"],
    ["CONFIRMED", "confirmed"],
  ];
  for (const [step, word] of steps) {
    const reached = moving.filter((s) => PROGRESS.indexOf(s) >= PROGRESS.indexOf(step)).length;
    if (reached > 0 && reached < n) return `${reached} of ${n} ${word}`;
  }
  return null;
}

/** A customer may cancel while no seller has started packing: every live part PENDING or CONFIRMED. */
export const CUSTOMER_CANCELABLE: OrderStatusKey[] = ["PENDING", "CONFIRMED"];
export function canCustomerCancel(storeStatuses: OrderStatusKey[]): boolean {
  const live = storeStatuses.filter((s) => s !== "CANCELED");
  return live.length > 0 && live.every((s) => CUSTOMER_CANCELABLE.includes(s));
}

/**
 * One seller's part on its own (so a slow seller doesn't hold the rest back): while that part is
 * PENDING / CONFIRMED and other parts are still live — when it's the only one left, that's a whole-order cancel.
 */
export function canCustomerCancelPart(storeStatuses: OrderStatusKey[], partStatus: OrderStatusKey): boolean {
  return CUSTOMER_CANCELABLE.includes(partStatus) && storeStatuses.filter((s) => s !== "CANCELED").length > 1;
}

/**
 * What the canceled sellers' parts come to, when only SOME parts were canceled — taken off the total the
 * customer still pays. 0 when nothing (or everything) was canceled: a fully canceled order keeps its
 * original total for the record. The stored order totals never change (they're the placement snapshot).
 */
export function canceledPartsTotal(parts: { status: OrderStatusKey; total: number }[]): number {
  const canceled = parts.filter((p) => p.status === "CANCELED");
  if (canceled.length === 0 || canceled.length === parts.length) return 0;
  return canceled.reduce((n, p) => n + p.total, 0);
}

/** URL slug ↔ status for the list's filter pills (?status=out-for-delivery). */
export const statusSlug = (s: OrderStatusKey) => s.toLowerCase().replace(/_/g, "-");
export const statusFromSlug = (slug: string | undefined): OrderStatusKey | null =>
  ORDER_STATUSES.find((s) => statusSlug(s) === slug) ?? null;

export const accountOrderHref = (orderNumber: number) => `/dashboard/orders/${orderNumber}`;

// ── Seller Center › Order Manage ────────────────────────────────────────────────────────────────

/**
 * Where a seller may move its StoreOrder from each status: forward one step along the delivery line,
 * cancel until it ships, Failed to deliver while out for delivery, Returned after delivery.
 * CANCELED, RETURNED and FAILED are final (empty list).
 */
export const VENDOR_NEXT_STATUSES: Record<OrderStatusKey, OrderStatusKey[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PACKAGING", "CANCELED"],
  PACKAGING: ["OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  FAILED: [],
  CANCELED: [],
};
export const canVendorMove = (from: OrderStatusKey, to: OrderStatusKey) => VENDOR_NEXT_STATUSES[from].includes(to);

/**
 * Sundry earns its commission only when a sale completes: charged on DELIVERED, an estimate while the
 * part is still on its way, and not charged at all when it was canceled, returned or not delivered.
 * (StoreOrder.commission is the amount computed at placement; this says whether it actually applies.)
 */
export type CommissionState = "charged" | "estimated" | "not-charged";
export const commissionState = (s: OrderStatusKey): CommissionState =>
  s === "DELIVERED" ? "charged" : s === "CANCELED" || s === "RETURNED" || s === "FAILED" ? "not-charged" : "estimated";

export const vendorOrderHref = (storeOrderId: string) => `/vendor/orders/${storeOrderId}`;
/** Admin › Order Manage: the whole order (every store's part), and its full invoice. */
export const adminOrderHref = (orderNumber: number) => `/admin/orders/${orderNumber}`;
export const adminInvoiceHref = (orderNumber: number) => `/api/admin/orders/${orderNumber}/invoice`;
export const vendorInvoiceHref = (storeOrderId: string) => `/api/vendor/orders/${storeOrderId}/invoice`;

/**
 * A buyer's phone as sellers see it (vendororderlist / vendororderdetails designs): country code and last
 * four digits only — Sundry delivers, so the full number never leaves the server for vendor views.
 */
export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  const code = /^\s*(\+\d{1,3})[\s(-]/.exec(phone ?? "")?.[1];
  return `${code ? `${code} ` : ""}•••• ${digits.slice(-4)}`;
}

// ── Tracking ────────────────────────────────────────────────────────────────────────────────────

/** `date` + n business days (Saturdays and Sundays skipped; public holidays aren't known). */
export function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d;
}

/**
 * Estimated delivery window for an order, from when it was placed and its delivery speed (Standard
 * 5–7 / Express 1–3 business days). An estimate only — it isn't stored and sellers can be faster.
 */
export function estimatedDelivery(placedAt: Date, method: ShippingMethod): { from: Date; to: Date } {
  const [min, max] = SHIPPING_METHOD_INFO[method].days;
  return { from: addBusinessDays(placedAt, min), to: addBusinessDays(placedAt, max) };
}

export const trackOrderHref = (orderNumber?: number) => (orderNumber ? `/dashboard/track-order?order=${orderNumber}` : "/dashboard/track-order");
