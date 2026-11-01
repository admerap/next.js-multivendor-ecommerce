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
export const ORDER_STATUS_LABEL: Record<OrderStatusKey, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  FAILED: "Failed",
  CANCELED: "Canceled",
};

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

/** A customer may cancel while no seller has started packing: every live part PENDING or CONFIRMED. */
export const CUSTOMER_CANCELABLE: OrderStatusKey[] = ["PENDING", "CONFIRMED"];
export function canCustomerCancel(storeStatuses: OrderStatusKey[]): boolean {
  const live = storeStatuses.filter((s) => s !== "CANCELED");
  return live.length > 0 && live.every((s) => CUSTOMER_CANCELABLE.includes(s));
}

/** URL slug ↔ status for the list's filter pills (?status=out-for-delivery). */
export const statusSlug = (s: OrderStatusKey) => s.toLowerCase().replace(/_/g, "-");
export const statusFromSlug = (slug: string | undefined): OrderStatusKey | null =>
  ORDER_STATUSES.find((s) => statusSlug(s) === slug) ?? null;

export const accountOrderHref = (orderNumber: number) => `/account/orders/${orderNumber}`;
