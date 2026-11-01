"use server";

import { z } from "zod";
import { auth } from "@/auth";
import type { CartQuote } from "@/lib/checkout";
import { quoteCart } from "@/lib/checkout.server";
import { prisma } from "@/lib/db";
import { cartCouponsSchema, cartLinesSchema, couponCodeSchema, shippingMethodSchema } from "@/lib/validations/checkout";

const linesSchema = cartLinesSchema;
const codeSchema = couponCodeSchema;
const couponsSchema = cartCouponsSchema;

const quoteSchema = z.object({ lines: linesSchema, coupons: couponsSchema, shippingMethod: shippingMethodSchema });

/** The signed-in shopper, for per-customer and first-order coupon rules (null = guest). */
async function viewerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

const LOAD_ERROR = "We couldn't load your cart totals. Check your connection and try again.";

/**
 * Live quote for the browser cart (public — guests can see their cart): current prices, stock,
 * shipping, tax, the applied store coupons and totals, all recomputed from the database. The browser
 * sends ids, quantities and coupon codes only.
 */
export async function getCartQuote(input: unknown): Promise<{ success: true; data: CartQuote } | { success: false; error: string }> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Your cart couldn't be read. Refresh the page and try again." };
  try {
    return { success: true, data: await quoteCart(parsed.data.lines, { coupons: parsed.data.coupons, userId: await viewerId(), shippingMethod: parsed.data.shippingMethod }) };
  } catch (error) {
    console.error("[cart quote] failed", error instanceof Error ? error.message : error);
    return { success: false, error: LOAD_ERROR };
  }
}

export type CouponApplyResult =
  | { success: true; applied: { vendorId: string; store: string; code: string; discount: number; freeShipping: boolean }[] }
  | { success: false; error: string };

/**
 * "Apply" in the coupon box. Codes are unique per store, so the code is looked up among the stores in
 * the cart (approved coupons only), then validated against that store's lines with validateCoupon via
 * the quote engine — the same check every later quote and placeOrder repeat. Nothing is stored here;
 * the client keeps the code and sends it with each quote.
 */
export async function applyCoupon(input: unknown): Promise<CouponApplyResult> {
  const parsed = z.object({ code: codeSchema, lines: linesSchema.min(1), coupons: couponsSchema, shippingMethod: shippingMethodSchema }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter a valid coupon code." };
  const { code, lines, coupons, shippingMethod } = parsed.data;
  try {
    const owners = await prisma.product.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.productId))] } }, select: { vendorId: true } });
    const vendorIds = [...new Set(owners.map((o) => o.vendorId))];
    const matches = await prisma.coupon.findMany({ where: { code, vendorId: { in: vendorIds }, approvalStatus: "APPROVED" }, select: { vendorId: true } });
    if (matches.length === 0) return { success: false, error: "This coupon code isn't valid for the items in your cart." };

    const tried = Object.fromEntries(matches.map((m) => [m.vendorId, code]));
    const quote = await quoteCart(lines, { coupons: { ...coupons, ...tried }, userId: await viewerId(), shippingMethod });
    const stores = quote.stores.filter((s) => s.vendor.id in tried);
    const applied = stores.flatMap((s) => (s.coupon?.code === code ? [{ vendorId: s.vendor.id, store: s.vendor.name, code, discount: s.coupon.discount, freeShipping: s.coupon.freeShipping }] : []));
    if (applied.length === 0) return { success: false, error: stores.find((s) => s.couponError)?.couponError?.message ?? "This coupon can't be applied to your cart." };
    return { success: true, applied };
  } catch (error) {
    console.error("[apply coupon] failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't check this coupon right now. Please try again." };
  }
}
