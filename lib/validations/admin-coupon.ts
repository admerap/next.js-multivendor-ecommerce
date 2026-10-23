import { z } from "zod";
import { DENY_REASON_MAX } from "@/lib/validations/admin-product";

/** The three admin Coupon Manage lists (routes /admin/coupons/<view>). */
const ADMIN_COUPON_VIEWS = ["pending", "approved", "denied"] as const;
export type AdminCouponView = (typeof ADMIN_COUPON_VIEWS)[number];

const id = z.string().trim().min(1).max(40);

/** URL search params of the admin coupon lists. Anything unknown falls back to the default. */
export const adminCouponListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  /** Vendor id */
  vendor: z.string().trim().max(40).catch(""),
  /** Derived status: the vendor's on/off switch + the date window. */
  status: z.enum(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});

export const adminCouponIdSchema = z.object({ id });

/** One-tap reasons for denying a coupon; the admin can edit the text before sending. */
export const COUPON_DENY_PRESETS = ["Discount looks too high", "Misleading title", "Dates look wrong", "Duplicates another coupon"] as const;

/** Deny requires a reason the vendor sees on the coupon (same rule as products). */
export const adminCouponDenySchema = z.object({
  id,
  reason: z
    .string()
    .trim()
    .min(3, "Tell the vendor why (at least 3 characters).")
    .max(DENY_REASON_MAX, `Keep the reason under ${DENY_REASON_MAX} characters.`),
});
