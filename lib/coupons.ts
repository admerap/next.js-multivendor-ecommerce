import { money } from "@/lib/money";
import type { CouponDiscountTypeValue, CouponTypeValue } from "@/lib/validations/coupon";

/** Shared (client + server) coupon helpers: derived status and display values. */

export const COUPON_STATUSES = ["ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];
export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = { ACTIVE: "Active", SCHEDULED: "Scheduled", EXPIRED: "Expired", INACTIVE: "Inactive" };

/** YYYY-MM-DD of a @db.Date value (stored as midnight UTC). */
export const dayOf = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/**
 * Status from the vendor switch + the date window (days inclusive):
 * Inactive (switched off) › Scheduled (starts later) › Expired (ended) › Active.
 */
export function couponStatus(c: { isActive: boolean; startsAt: Date | string; expiresAt: Date | string }, today: string): CouponStatus {
  if (!c.isActive) return "INACTIVE";
  if (dayOf(c.startsAt) > today) return "SCHEDULED";
  if (dayOf(c.expiresAt) < today) return "EXPIRED";
  return "ACTIVE";
}

type Valued = { type: CouponTypeValue; discountType: CouponDiscountTypeValue; discountValue: number };

/** Short value for the chip / ticket: "15%", "$50", "FREE". */
export function couponValueLabel(c: Valued) {
  if (c.type === "FREE_DELIVERY") return "FREE";
  return c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : money(c.discountValue).replace(/\.00$/, "");
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
/** Dates are calendar days stored at midnight UTC, so format them in UTC. */
export const couponDate = (d: Date | string, long = false) => (long ? longDate : shortDate).format(new Date(`${dayOf(d)}T00:00:00Z`));
