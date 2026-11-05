/**
 * Checkout shapes (client-safe). The quote itself is computed on the server (lib/checkout.server.ts)
 * from live product data — the browser cart only says WHAT and HOW MANY, never the price.
 * Money is integer cents everywhere (CLAUDE.md §6).
 */

/** Delivery speed, chosen once for the whole order — every store ships with it. */
export const SHIPPING_METHODS = ["STANDARD", "EXPRESS"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];
/** Express surcharge per store that ships something physical, on top of its normal shipping. */
export const EXPRESS_FEE_CENTS = 999;
/** `days`: the business-day window behind `eta` (used for the estimated delivery date on tracking). */
export const SHIPPING_METHOD_INFO: Record<ShippingMethod, { label: string; eta: string; days: readonly [number, number] }> = {
  STANDARD: { label: "Standard Delivery", eta: "5–7 business days", days: [5, 7] },
  EXPRESS: { label: "Express Delivery", eta: "1–3 business days", days: [1, 3] },
};

/** Where the order ships — decides the sales tax (country as on the address form, state / province code). */
export type ShipTo = { country: string; state: string };

/** Sales-tax rate in thousandths of a percent (6350 = 6.35%, 6875 = 6.875%) → "6.35%" / "6.875%". */
export const formatTaxRate = (rate: number) => `${Number((rate / 1000).toFixed(3))}%`;
/** "Tax (CT 6.35%)" — or plain "Tax" when no rate applies. */
export const taxLabel = (region: string | null | undefined, rate: number) => (region && rate > 0 ? `Tax (${region} ${formatTaxRate(rate)})` : "Tax");

/** What the browser sends: a cart line key, the product / variation and the wanted quantity. */
export type CartLineInput = { id: string; productId: string; variationId?: string | null; qty: number };

export type QuoteIssue =
  /** product hidden, denied, deleted, or its store / category is no longer visible */
  | "unavailable"
  /** the chosen variation no longer exists */
  | "variation-gone"
  | "out-of-stock"
  /** quantity lowered to what's in stock */
  | "qty-capped"
  /** quantity raised to the product's minimum order */
  | "qty-min";

export type QuotedLine = {
  /** the cart line key (productId or productId:variationId) */
  id: string;
  productId: string;
  variationId: string | null;
  name: string;
  slug: string | null;
  variationName: string | null;
  sku: string | null;
  image: string | null;
  /** live unit price after the product's own discount */
  unitPrice: number;
  /** crossed-out unit price (before the product discount), or null */
  compareAt: number | null;
  /** quantity used for the totals (may differ from the requested one — see issue) */
  qty: number;
  /** stock cap (null = no limit, digital) */
  maxQty: number | null;
  minQty: number;
  digital: boolean;
  /** unitPrice × qty */
  subtotal: number;
  /** this line's share of its store coupon (Part 3) */
  discount: number;
  tax: number;
  /** subtotal − discount + tax (shipping is per store) */
  total: number;
  /** false → excluded from every total until removed */
  available: boolean;
  issue: QuoteIssue | null;
  /** human message for the issue */
  message: string | null;
};

export type QuotedStore = {
  vendor: { id: string; name: string; slug: string };
  lines: QuotedLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  /** The store's applied coupon: `discount` = item discount, or the shipping waived when freeShipping. */
  coupon: { code: string; couponId: string; type: "DISCOUNT" | "FREE_DELIVERY" | "FIRST_ORDER"; discount: number; freeShipping: boolean } | null;
  /** A code the shopper applied that doesn't (or no longer) qualify, and why. */
  couponError: { code: string; message: string } | null;
};

export type CartQuote = {
  stores: QuotedStore[];
  /** items in stock that count toward the totals */
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  /** cart subtotal reached the free-shipping threshold → every store ships free with Standard Delivery */
  freeShipping: boolean;
  /** the delivery speed these totals use */
  shippingMethod: ShippingMethod;
  /** order shipping for each method (free-delivery coupons included), for the method picker */
  shippingOptions: Record<ShippingMethod, number>;
  /** at least one physical item → a delivery method applies (digital-only orders don't ship) */
  needsShipping: boolean;
  /** the destination's sales tax (null = no destination given yet, or no rate for it) */
  taxRegion: { region: string; rate: number } | null;
  /** no destination yet (cart step): tax is "Calculated at shipping" and isn't in the total */
  taxPending: boolean;
  freeShippingThreshold: number;
  /** lines that need the shopper's attention (unavailable, out of stock, quantity changed) */
  issueCount: number;
  /** checkout is blocked: nothing purchasable, or an unavailable / out-of-stock line is still in the cart */
  blocked: boolean;
};
