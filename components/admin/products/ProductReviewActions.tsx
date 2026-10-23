"use client";

import { approveProduct, denyProduct } from "@/app/admin/(panel)/products/actions";
import { ReviewActions } from "@/components/admin/review/ReviewActions";
import { DENY_REASON_PRESETS } from "@/lib/validations/admin-product";
import type { ApprovalStatus } from "@/lib/validations/product";

/** Approve / Deny on the admin product details page. */
export function ProductReviewActions({ id, name, vendorName, status }: { id: string; name: string; vendorName: string; status: ApprovalStatus }) {
  return (
    <ReviewActions
      id={id}
      vendorName={vendorName}
      status={status}
      noun="product"
      approve={approveProduct}
      deny={denyProduct}
      approvedText={{ live: `Approved — ${name} is now live`, hidden: `Approved — ${vendorName} keeps it hidden until they turn it on` }}
      presets={DENY_REASON_PRESETS}
    />
  );
}
