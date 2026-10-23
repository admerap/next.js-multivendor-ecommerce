import { Badge } from "@/components/ui/badge";
import { couponValueLabel, COUPON_STATUS_LABELS, type CouponStatus } from "@/lib/coupons";
import { cn } from "@/lib/utils";
import type { CouponDiscountTypeValue, CouponTypeValue } from "@/lib/validations/coupon";

const STATUS_TONE = { ACTIVE: "success", SCHEDULED: "info", EXPIRED: "error", INACTIVE: "neutral" } as const;

/** Active = success · Scheduled = info · Expired = error · Inactive = neutral. */
export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{COUPON_STATUS_LABELS[status]}</Badge>;
}

const CHIP_TONE: Record<CouponTypeValue, string> = {
  DISCOUNT: "bg-iris-50 text-primary",
  FREE_DELIVERY: "bg-success-50 text-success-600",
  FIRST_ORDER: "bg-saffron-50 text-saffron-700",
};

/** 44px value tile from the design ("15%", "$50", "FREE"), tinted by coupon type. */
export function CouponChip({ coupon, className }: { coupon: { type: CouponTypeValue; discountType: CouponDiscountTypeValue; discountValue: number }; className?: string }) {
  const label = couponValueLabel(coupon);
  return (
    <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-md text-caption font-extrabold tabular-nums", label.length > 4 && "text-[0.7rem]", CHIP_TONE[coupon.type], className)}>
      {label}
    </span>
  );
}
