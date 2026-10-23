import { z } from "zod";
import { toCents } from "@/lib/validations/product";

/** Vendor › Coupon Manage (vendorcoupon design). Shared by the form, the pages and the server actions. */

export const COUPON_TYPES = ["DISCOUNT", "FREE_DELIVERY", "FIRST_ORDER"] as const;
export const COUPON_DISCOUNT_TYPES = ["AMOUNT", "PERCENTAGE"] as const;
export const COUPON_SCOPES = ["STORE_WIDE", "SPECIFIC_PRODUCTS"] as const;
export type CouponTypeValue = (typeof COUPON_TYPES)[number];
export type CouponDiscountTypeValue = (typeof COUPON_DISCOUNT_TYPES)[number];
export type CouponScopeValue = (typeof COUPON_SCOPES)[number];

/**
 * What vendors pick in "Coupon Type". Stored as type + discountType (no schema change):
 * PERCENTAGE = DISCOUNT + PERCENTAGE · FIXED = DISCOUNT + AMOUNT · FREE_SHIPPING = FREE_DELIVERY.
 * (FIRST_ORDER stays in the DB enum but is no longer offered.)
 */
export const COUPON_KINDS = ["PERCENTAGE", "FIXED", "FREE_SHIPPING"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];
export const COUPON_KIND_LABELS: Record<CouponKind, string> = { PERCENTAGE: "Percentage discount", FIXED: "Fixed amount", FREE_SHIPPING: "Free shipping" };

export function couponKindOf(c: { type: CouponTypeValue | ""; discountType: CouponDiscountTypeValue }): CouponKind | "" {
  if (c.type === "") return "";
  if (c.type === "FREE_DELIVERY") return "FREE_SHIPPING";
  return c.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
}
export const kindToStorage = (k: CouponKind): { type: CouponTypeValue; discountType: CouponDiscountTypeValue } =>
  k === "FREE_SHIPPING" ? { type: "FREE_DELIVERY", discountType: "AMOUNT" } : { type: "DISCOUNT", discountType: k === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT" };

/** Label for a stored coupon (list, ticket). */
export const couponKindLabel = (c: { type: CouponTypeValue; discountType: CouponDiscountTypeValue }) =>
  c.type === "FIRST_ORDER" ? "First order" : COUPON_KIND_LABELS[couponKindOf(c) as CouponKind];
export const COUPON_SCOPE_LABELS: Record<CouponScopeValue, string> = { STORE_WIDE: "Entire store", SPECIFIC_PRODUCTS: "Specific products" };

export const COUPON_LIMITS = { title: 100, code: 32, products: 500, perUser: 10_000, total: 1_000_000 } as const;

/** 10 characters without look-alikes (no 0/O, 1/I) — design "Generate code". */
export function generateCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}

/** Today as YYYY-MM-DD (UTC) — coupon dates are whole calendar days, both inclusive. */
export const todayIso = () => new Date().toISOString().slice(0, 10);

const money = /^\d{1,6}(\.\d{1,2})?$/;
const whole = /^\d{1,7}$/;

/** "" → null, otherwise a whole number in range. */
const optionalInt = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || whole.test(v), `${label} must be a whole number`)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((n) => n === null || (n >= 1 && n <= max), `${label} must be between 1 and ${max.toLocaleString("en-US")}`);

/** "" → fallback, otherwise dollars → cents. */
const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || money.test(v), `Enter ${label} like 100 or 99.50`)
    .transform((v) => (v === "" ? null : toCents(v)));

export const couponFormSchema = z
  .object({
    // New/edited coupons are one of the 3 kinds (FIRST_ORDER is no longer offered).
    type: z.enum(["DISCOUNT", "FREE_DELIVERY"], "Choose a coupon type"),
    title: z.string("Enter a coupon title").trim().min(3, "Coupon title must be at least 3 characters").max(COUPON_LIMITS.title, `Coupon title must be ${COUPON_LIMITS.title} characters or fewer`),
    code: z
      .string("Enter a coupon code")
      .trim()
      .toUpperCase()
      .min(3, "Coupon code must be at least 3 characters")
      .max(COUPON_LIMITS.code, `Coupon code must be ${COUPON_LIMITS.code} characters or fewer`)
      .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, dashes or underscores only"),
    limitPerUser: optionalInt("Limit for same user", COUPON_LIMITS.perUser),
    usageLimit: optionalInt("Total usage limit", COUPON_LIMITS.total),
    discountType: z.enum(COUPON_DISCOUNT_TYPES),
    discountValue: z.string().trim(),
    minPurchase: optionalMoney("a minimum purchase"),
    maxDiscount: optionalMoney("a maximum discount"),
    startsAt: z.iso.date("Choose a start date"),
    expiresAt: z.iso.date("Choose an expire date"),
    scope: z.enum(COUPON_SCOPES),
    productIds: z.array(z.string().trim().min(1).max(40)).max(COUPON_LIMITS.products, `At most ${COUPON_LIMITS.products} products`),
    isActive: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    // Free shipping waives shipping, so it has no discount amount (design).
    if (d.type !== "FREE_DELIVERY") {
      if (d.discountType === "PERCENTAGE") {
        if (!/^\d{1,3}$/.test(d.discountValue) || Number(d.discountValue) < 1) issue("discountValue", "Enter a whole percentage from 1 to 100");
        else if (Number(d.discountValue) > 100) issue("discountValue", "A percentage discount cannot be more than 100%");
      } else if (!money.test(d.discountValue) || toCents(d.discountValue) <= 0) {
        issue("discountValue", "Enter a discount amount like 50 or 12.50");
      }
    }
    if (d.expiresAt < d.startsAt) issue("expiresAt", "Expire date must be on or after the start date");
    if (d.limitPerUser !== null && d.usageLimit !== null && d.limitPerUser > d.usageLimit) {
      issue("limitPerUser", "Limit for same user can't be more than the total usage limit");
    }
    if (d.scope === "SPECIFIC_PRODUCTS" && d.productIds.length === 0) issue("productIds", "Choose at least one of your products");
    if (new Set(d.productIds).size !== d.productIds.length) issue("productIds", "A product is selected twice");
  })
  .transform((d) => {
    const free = d.type === "FREE_DELIVERY";
    const percent = !free && d.discountType === "PERCENTAGE";
    return {
      ...d,
      // Stored as cents (AMOUNT) or whole percent (PERCENTAGE); 0 for free shipping.
      discountType: free ? ("AMOUNT" as const) : d.discountType,
      discountValue: free ? 0 : percent ? Number(d.discountValue) : toCents(d.discountValue),
      minPurchase: d.minPurchase ?? 0,
      // The cap only applies to percentage coupons.
      maxDiscount: percent ? d.maxDiscount : null,
      productIds: d.scope === "SPECIFIC_PRODUCTS" ? d.productIds : [],
    };
  });

export type CouponFormInput = z.input<typeof couponFormSchema>;
export type CouponFormData = z.output<typeof couponFormSchema>;

/** URL search params of /vendor/coupons. Anything unknown falls back to the default. */
export const couponListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE"]).catch("ALL"),
  /** Admin review filter */
  approval: z.enum(["ALL", "PENDING", "APPROVED", "REJECTED"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type CouponListParams = z.infer<typeof couponListSchema>;

export const couponIdSchema = z.object({ id: z.string().trim().min(1).max(40) });
export const couponActiveSchema = z.object({ id: z.string().trim().min(1).max(40), isActive: z.boolean() });
