"use client";

import { approveCoupon, denyCoupon } from "@/app/admin/(panel)/coupons/actions";
import { useCan } from "@/components/admin/AdminPermissions";
import { ReviewActions } from "@/components/admin/review/ReviewActions";
import { COUPON_DENY_PRESETS } from "@/lib/validations/admin-coupon";
import type { ApprovalStatus } from "@/lib/validations/product";

/** Approve / Deny on the admin coupon details page. */
export function CouponReviewActions({ id, code, vendorName, status }: { id: string; code: string; vendorName: string; status: ApprovalStatus }) {
  // Approve / Deny need Coupons › Update; without it the status column shows a dash.
  if (!useCan("coupons", "update")) return <span className="text-fg-subtle">—</span>;
  return (
    <ReviewActions
      id={id}
      vendorName={vendorName}
      status={status}
      noun="coupon"
      approve={approveCoupon}
      deny={denyCoupon}
      approvedText={{ live: `Approved — shoppers can use ${code}`, hidden: `Approved — ${vendorName} has ${code} switched off` }}
      presets={COUPON_DENY_PRESETS}
    />
  );
}
