import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { couponStatus, dayOf, type CouponStatus } from "@/lib/coupons";
import { prisma } from "@/lib/db";
import { money } from "@/lib/money";
import { todayIso } from "@/lib/validations/coupon";

/** YYYY-MM-DD → the @db.Date value Prisma stores (midnight UTC). */
export const toDbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * Prisma filter for a derived coupon status (days inclusive; @db.Date compares by calendar day).
 * Shared by the vendor and admin coupon lists so both filter exactly like couponStatus() labels.
 */
export function couponStatusWhere(status: CouponStatus, today: Date): Prisma.CouponWhereInput {
  switch (status) {
    case "INACTIVE":
      return { isActive: false };
    case "SCHEDULED":
      return { isActive: true, startsAt: { gt: today } };
    case "EXPIRED":
      return { isActive: true, startsAt: { lte: today }, expiresAt: { lt: today } };
    case "ACTIVE":
      return { isActive: true, startsAt: { lte: today }, expiresAt: { gte: today } };
  }
}

/**
 * validateCoupon — the contract checkout will call (the final "apply at checkout" wiring lands when
 * checkout is built). THE CORE RULE: a vendor's coupon only ever discounts that vendor's own lines.
 * Which lines belong to the vendor is decided from the database (Product.vendorId), never from data
 * the client sends, so a mixed multi-seller cart can't route a discount onto another store's items.
 */

const cartLineSchema = z.object({
  /** cart line id (returned in appliesToItemIds / lineDiscounts) */
  id: z.string().min(1).max(60),
  productId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(10_000),
  /** cents, after the product's own discount — the price the customer pays per unit */
  unitPrice: z.number().int().min(0).max(100_000_000),
});
export type CartLine = z.infer<typeof cartLineSchema>;

const inputSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(32),
  /** the store whose coupon box the customer typed into (codes are unique per vendor) */
  vendorId: z.string().min(1).max(40),
  items: z.array(cartLineSchema).max(500),
  userId: z.string().max(40).nullish(),
  /** this store's shipping charge in the cart, cents — what FREE_DELIVERY waives */
  shipping: z.number().int().min(0).max(100_000_000).default(0),
  /**
   * Redemption history from checkout until the Order model exists:
   * TODO(orders): read these from orders instead of trusting the caller.
   */
  history: z.object({ userRedemptions: z.number().int().min(0), ordersWithVendor: z.number().int().min(0) }).default({ userRedemptions: 0, ordersWithVendor: 0 }),
  /** YYYY-MM-DD; defaults to today (UTC) — injectable for tests */
  today: z.iso.date().optional(),
});
export type ValidateCouponInput = z.input<typeof inputSchema>;

export type CouponCheck =
  | {
      valid: true;
      couponId: string;
      code: string;
      type: "DISCOUNT" | "FREE_DELIVERY" | "FIRST_ORDER";
      /** total discount in cents (for FREE_DELIVERY: the shipping waived) */
      discountAmount: number;
      /** cart lines the coupon touches — only the coupon vendor's lines */
      appliesToItemIds: string[];
      /** per-line split of the item discount (cents, sums to discountAmount; empty for FREE_DELIVERY) */
      lineDiscounts: Record<string, number>;
      freeShipping: boolean;
    }
  | { valid: false; discountAmount: 0; appliesToItemIds: []; error: string };

const invalid = (error: string): CouponCheck => ({ valid: false, discountAmount: 0, appliesToItemIds: [], error });

/** Splits `total` over lines by their subtotal; rounding remainder goes to the largest shares (exact sum). */
function allocate(total: number, lines: { id: string; subtotal: number }[]): Record<string, number> {
  const sum = lines.reduce((n, l) => n + l.subtotal, 0);
  if (!sum || !total) return Object.fromEntries(lines.map((l) => [l.id, 0]));
  const raw = lines.map((l) => ({ id: l.id, exact: (total * l.subtotal) / sum }));
  const out = Object.fromEntries(raw.map((r) => [r.id, Math.floor(r.exact)]));
  let left = total - Object.values(out).reduce((n, x) => n + x, 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left <= 0) break;
    out[r.id] += 1;
    left -= 1;
  }
  return out;
}

export async function validateCoupon(rawInput: ValidateCouponInput): Promise<CouponCheck> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) return invalid("Enter a valid coupon code.");
  const { code, vendorId, items, userId, shipping, history } = parsed.data;
  const today = parsed.data.today ?? todayIso();

  const coupon = await prisma.coupon.findUnique({
    where: { vendorId_code: { vendorId, code } },
    include: { products: { select: { productId: true } }, vendor: { select: { storeName: true } } },
  });
  // Only admin-approved coupons apply; a pending/denied one looks like an unknown code to shoppers.
  if (!coupon || coupon.approvalStatus !== "APPROVED") return invalid("This coupon code isn't valid for this store.");

  // Active + date window (calendar days, inclusive).
  const status = couponStatus(coupon, today);
  if (status === "INACTIVE") return invalid("This coupon isn't active.");
  if (status === "SCHEDULED") return invalid(`This coupon starts on ${dayOf(coupon.startsAt)}.`);
  if (status === "EXPIRED") return invalid("This coupon has expired.");

  // Usage limits.
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return invalid("This coupon has been fully redeemed.");
  if (coupon.limitPerUser !== null) {
    if (!userId) return invalid("Sign in to use this coupon.");
    if (history.userRedemptions >= coupon.limitPerUser) return invalid("You've already used this coupon the maximum number of times.");
  }
  if (coupon.type === "FIRST_ORDER") {
    if (!userId) return invalid("Sign in to use this coupon.");
    if (history.ordersWithVendor > 0) return invalid(`This coupon is only for your first order from ${coupon.vendor.storeName}.`);
  }

  // THE CORE RULE — the vendor's lines come from the database, not from the client.
  const ids = [...new Set(items.map((i) => i.productId))];
  const owners = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, vendorId: true } });
  const vendorOf = new Map(owners.map((p) => [p.id, p.vendorId]));
  const vendorLines = items.filter((i) => vendorOf.get(i.productId) === coupon.vendorId);
  if (vendorLines.length === 0) return invalid(`Add products from ${coupon.vendor.storeName} to use this coupon.`);

  // Minimum purchase is checked against THIS vendor's subtotal only.
  const vendorSubtotal = vendorLines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  if (vendorSubtotal < coupon.minPurchase) {
    return invalid(`Spend ${money(coupon.minPurchase - vendorSubtotal)} more from ${coupon.vendor.storeName} to use this coupon (minimum ${money(coupon.minPurchase)}).`);
  }

  if (coupon.type === "FREE_DELIVERY") {
    return { valid: true, couponId: coupon.id, code: coupon.code, type: coupon.type, discountAmount: shipping, appliesToItemIds: vendorLines.map((l) => l.id), lineDiscounts: {}, freeShipping: true };
  }

  // Lines the discount applies to: all of the vendor's, or only the coupon's products.
  const targeted = coupon.scope === "SPECIFIC_PRODUCTS" ? new Set(coupon.products.map((p) => p.productId)) : null;
  const eligible = vendorLines.filter((l) => !targeted || targeted.has(l.productId));
  if (eligible.length === 0) return invalid("This coupon doesn't apply to the products in your cart.");
  const eligibleSubtotal = eligible.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((eligibleSubtotal * coupon.discountValue) / 100)
      : coupon.discountValue;
  if (coupon.discountType === "PERCENTAGE" && coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal)); // never more than what it applies to

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    discountAmount: discount,
    appliesToItemIds: eligible.map((l) => l.id),
    lineDiscounts: allocate(discount, eligible.map((l) => ({ id: l.id, subtotal: l.unitPrice * l.quantity }))),
    freeShipping: false,
  };
}
