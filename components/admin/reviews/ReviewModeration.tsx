"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { useCan } from "@/components/admin/AdminPermissions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { moderateReviewAction, setReviewVisibilityAction } from "@/lib/actions/admin-reviews";
import type { ReviewStatus } from "@prisma/client";

const OFFLINE = { success: false as const, error: "We couldn't reach the server. Please try again." };

/**
 * Admin › Review details › Moderation. Pending: Approve / Deny. Approved: the "Show on storefront"
 * switch (isVisible — active / inactive) and Deny to reverse it. Denied: Approve to reconsider.
 * The server re-checks the admin role and recomputes the product's stars on every change.
 */
export function ReviewModeration({ id, status, isVisible }: { id: string; status: ReviewStatus; isVisible: boolean }) {
  const [pending, start] = useTransition();
  const canUpdate = useCan("reviews", "update"); // moderating needs Reviews › Update

  const decide = (decision: "APPROVED" | "REJECTED") =>
    start(async () => {
      const res = await moderateReviewAction({ id, decision }).catch(() => OFFLINE);
      if (!res.success) return void toast.error(res.error);
      toast.success(
        decision === "APPROVED"
          ? isVisible
            ? "Review approved — it now shows on the product page"
            : "Review approved — still hidden until you switch it on"
          : "Review denied — it's hidden from the storefront",
      );
    });

  const toggle = (on: boolean) =>
    start(async () => {
      const res = await setReviewVisibilityAction({ id, isVisible: on }).catch(() => OFFLINE);
      if (!res.success) return void toast.error(res.error);
      toast.success(on ? "Review shown on the storefront" : "Review hidden from the storefront");
    });

  return (
    <div className="flex flex-col gap-4">
      {status === "APPROVED" && (
        <label className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3.5 py-1.5">
          <span className="flex items-center gap-2.5 text-sm font-semibold text-fg-strong">
            {isVisible ? (
              <Eye aria-hidden className="size-4 text-success-600" strokeWidth={2} />
            ) : (
              <EyeOff aria-hidden className="size-4 text-fg-muted" strokeWidth={2} />
            )}
            Show on storefront
          </span>
          <Switch checked={isVisible} onCheckedChange={toggle} disabled={pending || !canUpdate} aria-label="Show this review on the storefront" />
        </label>
      )}
      <p className="text-caption text-fg-muted">
        {status === "PENDING"
          ? "Waiting for a decision. Approved reviews appear on the product page and count toward its stars."
          : status === "APPROVED"
            ? isVisible
              ? "Published — shown on the product page and counted in its stars."
              : "Approved but hidden — not shown and not counted in the stars."
            : "Denied — hidden from the storefront and not counted in the stars."}
      </p>
      {canUpdate && (
        <div className="flex flex-wrap gap-2.5">
          {status !== "APPROVED" && (
            <Button type="button" disabled={pending} onClick={() => decide("APPROVED")} className="flex-1">
              <Check aria-hidden />
              Approve
            </Button>
          )}
          {status !== "REJECTED" && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => decide("REJECTED")}
              className="flex-1 !text-error-600 hover:!bg-error-50"
            >
              <X aria-hidden />
              Deny
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
