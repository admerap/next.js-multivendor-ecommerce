import "server-only";

import { validateCoupon } from "@/lib/coupons.server";
import { prisma } from "@/lib/db";
import { EXPRESS_FEE_CENTS, type CartLineInput, type CartQuote, type QuotedLine, type QuotedStore, type QuoteIssue, type ShippingMethod, type ShipTo } from "@/lib/checkout";
import { FREE_SHIPPING_CENTS, productPricing } from "@/lib/storefront";
import { VISIBLE } from "@/lib/storefront.server";

/**
 * The checkout pricing engine — the ONE place prices, stock, shipping and tax are decided. The cart
 * page, the checkout summary and placeOrder all call it, so what the shopper sees is what the order
 * charges. It reads LIVE data; the browser cart only supplies product ids and quantities.
 *
 * Rules (PRD §10 + the checkout decisions):
 * - Unit price = the product's price (or the chosen variation's) after the product's own discount.
 * - Lines whose product isn't VISIBLE any more, whose variation is gone, or that are out of stock are
 *   kept in the quote (so the shopper sees why) but excluded from every total.
 * - Quantity is capped at stock and raised to the minimum order.
 * - Shipping is per store: Σ each physical line's shippingCost (× qty when shippingPerUnit).
 *   Standard Delivery: the whole order ships free once the cart subtotal reaches FREE_SHIPPING_CENTS
 *   (the header promise). Express Delivery: that normal shipping + EXPRESS_FEE_CENTS per store with a
 *   physical item, never free. One method for the whole order.
 * - Sales tax by destination: tax per line = (subtotal − its coupon share) × the ship-to region's
 *   TaxRate (thousandths of a percent), rounded. Shipping isn't taxed. With no destination yet (cart
 *   step) tax is 0 and taxPending is set; a destination without an active rate pays no tax.
 * - Coupons: one per store, re-validated on every quote (validateCoupon) against that store's lines only;
 *   a discount is split over the eligible lines; a free-delivery coupon waives that store's normal shipping (not the Express surcharge).
 */

const ISSUE_MESSAGE: Record<QuoteIssue, (n?: number) => string> = {
  unavailable: () => "This product is no longer available.",
  "variation-gone": () => "This option is no longer available.",
  "out-of-stock": () => "Out of stock.",
  "qty-capped": (n) => `Only ${n} in stock — quantity updated.`,
  "qty-min": (n) => `Minimum order is ${n} — quantity updated.`,
};

const LINE_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  thumbnail: true,
  productType: true,
  price: true,
  compareAtPrice: true,
  discountType: true,
  discountValue: true,
  stock: true,
  minOrderQty: true,
  shippingCost: true,
  shippingPerUnit: true,
  vendor: { select: { id: true, storeName: true, slug: true } },
  variations: { select: { id: true, name: true, sku: true, price: true, stock: true, image: true } },
} as const;

/** rate in thousandths of a percent (6350 = 6.35%) */
const taxOf = (amount: number, rate: number) => (rate > 0 ? Math.round((amount * rate) / 100_000) : 0);

/** The active sales-tax rate for a destination, or null when none is configured. */
export async function taxRateFor(to: ShipTo): Promise<{ region: string; rate: number } | null> {
  const region = to.state.trim().toUpperCase();
  if (!region) return null;
  const row = await prisma.taxRate.findUnique({ where: { country_region: { country: to.country, region } }, select: { rate: true, isActive: true } });
  return row?.isActive ? { region, rate: row.rate } : null;
}

export type QuoteOptions = {
  /** vendorId → coupon code the shopper applied for that store */
  coupons?: Record<string, string>;
  /** signed-in customer (per-user and first-order coupon rules) */
  userId?: string | null;
  /** delivery speed for the whole order (default Standard) */
  shippingMethod?: ShippingMethod;
  /** destination — decides the sales tax; omitted on the cart step ("Calculated at shipping") */
  shipTo?: ShipTo | null;
};

export async function quoteCart(lines: CartLineInput[], opts: QuoteOptions = {}): Promise<CartQuote> {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = ids.length ? await prisma.product.findMany({ where: { ...VISIBLE, id: { in: ids } }, select: LINE_SELECT }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const dest = opts.shipTo ? await taxRateFor(opts.shipTo) : null;
  const rate = dest?.rate ?? 0;

  type Work = { line: QuotedLine; vendor: QuotedStore["vendor"]; shipping: number };
  const work: Work[] = [];
  const unknownStore = { id: "", name: "Unavailable", slug: "" };

  for (const input of lines) {
    const p = byId.get(input.productId);
    const base = { id: input.id, productId: input.productId, variationId: input.variationId ?? null, discount: 0, tax: 0 };
    if (!p) {
      work.push({
        line: { ...base, name: "Unavailable product", slug: null, variationName: null, sku: null, image: null, unitPrice: 0, compareAt: null, qty: input.qty, maxQty: null, minQty: 1, digital: false, subtotal: 0, total: 0, available: false, issue: "unavailable", message: ISSUE_MESSAGE.unavailable() },
        vendor: unknownStore,
        shipping: 0,
      });
      continue;
    }

    const vendor = { id: p.vendor.id, name: p.vendor.storeName, slug: p.vendor.slug };
    const digital = p.productType === "DIGITAL";
    const variation = input.variationId ? p.variations.find((v) => v.id === input.variationId) : undefined;
    const wantsVariation = p.variations.length > 0;
    const pricing = productPricing({ ...p, price: variation?.price ?? p.price });
    const common = {
      ...base,
      name: p.name,
      slug: p.slug,
      variationName: variation?.name ?? null,
      sku: variation?.sku ?? p.sku,
      image: variation?.image ?? p.thumbnail,
      unitPrice: pricing.price,
      compareAt: pricing.compareAt,
      digital,
      minQty: Math.max(1, p.minOrderQty),
    };

    // A product with variations needs an existing one; a product without them mustn't name one.
    if ((wantsVariation && !variation) || (!wantsVariation && input.variationId)) {
      work.push({ line: { ...common, qty: input.qty, maxQty: null, subtotal: 0, total: 0, available: false, issue: "variation-gone", message: ISSUE_MESSAGE["variation-gone"]() }, vendor, shipping: 0 });
      continue;
    }

    const stock = digital ? null : (variation?.stock ?? p.stock);
    if (stock !== null && stock < common.minQty) {
      work.push({ line: { ...common, qty: input.qty, maxQty: Math.max(0, stock), subtotal: 0, total: 0, available: false, issue: "out-of-stock", message: ISSUE_MESSAGE["out-of-stock"]() }, vendor, shipping: 0 });
      continue;
    }

    let qty = input.qty;
    let issue: QuoteIssue | null = null;
    if (stock !== null && qty > stock) {
      qty = stock;
      issue = "qty-capped";
    }
    if (qty < common.minQty) {
      qty = common.minQty;
      issue = "qty-min";
    }
    const subtotal = common.unitPrice * qty;
    const shipping = digital ? 0 : p.shippingPerUnit ? p.shippingCost * qty : p.shippingCost;
    work.push({
      line: { ...common, qty, maxQty: stock, subtotal, total: subtotal, available: true, issue, message: issue === "qty-capped" ? ISSUE_MESSAGE["qty-capped"](stock!) : issue === "qty-min" ? ISSUE_MESSAGE["qty-min"](common.minQty) : null },
      vendor,
      shipping,
    });
  }

  const subtotal = work.reduce((n, w) => n + (w.line.available ? w.line.subtotal : 0), 0);
  const freeShipping = subtotal >= FREE_SHIPPING_CENTS;
  const method: ShippingMethod = opts.shippingMethod ?? "STANDARD";

  // Group by store, in cart order (marketplace rule): subtotal and shipping first.
  const stores = new Map<string, QuotedStore>();
  /** per store: normal shipping (before the free threshold) and whether it ships anything physical */
  const baseOf = new Map<QuotedStore, { base: number; physical: boolean }>();
  for (const w of work) {
    const key = w.vendor.id || "unavailable";
    const s = stores.get(key) ?? { vendor: w.vendor, lines: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, coupon: null, couponError: null };
    if (w.line.available) {
      s.subtotal += w.line.subtotal;
      const b = baseOf.get(s) ?? { base: 0, physical: false };
      b.base += w.shipping;
      b.physical ||= !w.line.digital;
      baseOf.set(s, b);
    }
    s.lines.push(w.line);
    stores.set(key, s);
  }

  // Each store's shipping for the chosen method; both methods are kept for the picker.
  const options = { STANDARD: 0, EXPRESS: 0 };
  for (const s of stores.values()) {
    const { base, physical } = baseOf.get(s) ?? { base: 0, physical: false };
    const standard = freeShipping ? 0 : base;
    const express = physical ? base + EXPRESS_FEE_CENTS : 0;
    s.shipping = method === "EXPRESS" ? express : standard;
    options.STANDARD += standard;
    options.EXPRESS += express;
  }

  // Then each store's coupon — validated by validateCoupon on THIS store's lines only (a vendor coupon
  // never discounts another store's items) — then tax on the discounted amounts.
  for (const s of stores.values()) {
    const code = s.vendor.id ? opts.coupons?.[s.vendor.id] : undefined;
    const buyable = s.lines.filter((l) => l.available);
    // What a free-delivery coupon can waive: the normal shipping still charged (never the Express fee).
    const base = baseOf.get(s)?.base ?? 0;
    const waivable = method === "EXPRESS" ? base : s.shipping;
    if (code && buyable.length) {
      const check = await validateCoupon({
        code,
        vendorId: s.vendor.id,
        items: buyable.map((l) => ({ id: l.id, productId: l.productId, quantity: l.qty, unitPrice: l.unitPrice })),
        userId: opts.userId ?? null,
        shipping: waivable,
      });
      if (check.valid) {
        if (check.freeShipping) {
          s.coupon = { code: check.code, couponId: check.couponId, type: check.type, discount: waivable, freeShipping: true };
          s.shipping -= waivable;
          options.STANDARD -= freeShipping ? 0 : base;
          options.EXPRESS -= base;
        } else {
          for (const l of buyable) l.discount = check.lineDiscounts[l.id] ?? 0;
          s.coupon = { code: check.code, couponId: check.couponId, type: check.type, discount: check.discountAmount, freeShipping: false };
        }
      } else {
        s.couponError = { code, message: check.error };
      }
    }
    for (const l of buyable) {
      l.tax = taxOf(l.subtotal - l.discount, rate);
      l.total = l.subtotal - l.discount + l.tax;
      s.discount += l.discount;
      s.tax += l.tax;
    }
    s.total = s.subtotal - s.discount + s.shipping + s.tax;
  }

  const list = [...stores.values()];
  const sum = (k: "subtotal" | "discount" | "shipping" | "tax" | "total") => list.reduce((n, s) => n + s[k], 0);
  const all = list.flatMap((s) => s.lines);
  const itemCount = all.reduce((n, l) => n + (l.available ? l.qty : 0), 0);
  return {
    stores: list,
    itemCount,
    subtotal: sum("subtotal"),
    discount: sum("discount"),
    shipping: sum("shipping"),
    tax: sum("tax"),
    total: sum("total"),
    freeShipping,
    freeShippingThreshold: FREE_SHIPPING_CENTS,
    shippingMethod: method,
    shippingOptions: options,
    needsShipping: [...baseOf.values()].some((b) => b.physical),
    taxRegion: dest,
    taxPending: !opts.shipTo,
    issueCount: all.filter((l) => l.issue !== null).length,
    // Checkout needs something to buy and nothing unbuyable left in the cart.
    blocked: itemCount === 0 || all.some((l) => !l.available),
  };
}
