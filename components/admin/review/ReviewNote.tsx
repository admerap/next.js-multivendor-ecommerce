import { CircleAlert, EyeOff, Info } from "lucide-react";
import type { ApprovalStatus } from "@/lib/validations/product";
import { cn } from "@/lib/utils";

/**
 * Banner at the top of an admin details page (product or coupon) with what the reviewer needs first:
 * the deny reason, a resubmission (with the previous reason), or — products only — an approved item
 * the vendor has hidden. Renders nothing otherwise.
 */
export function ReviewNote({
  noun,
  status,
  reason,
  hiddenByVendor = false,
}: {
  noun: "product" | "coupon";
  status: ApprovalStatus;
  reason: string | null;
  /** Approved but switched off by the vendor (products show this; coupons show it in their summary). */
  hiddenByVendor?: boolean;
}) {
  const note =
    status === "REJECTED"
      ? { tone: "bg-error-50 text-error-600", icon: CircleAlert, title: `Denied — the vendor sees this reason on its ${noun}`, prefix: "Reason" }
      : status === "PENDING" && reason
        ? { tone: "bg-info-50 text-info-600", icon: Info, title: "Resubmitted after being denied", prefix: "Previous reason" }
        : status === "APPROVED" && hiddenByVendor
          ? { tone: "border border-line bg-card text-fg-muted", icon: EyeOff, title: `Approved, but the vendor has hidden it — shoppers can't see it until the vendor turns it on.`, prefix: null }
          : null;
  if (!note) return null;
  const Icon = note.icon;
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-md px-4 py-3 text-sm font-semibold", note.tone)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
      <div className="flex min-w-0 flex-col gap-1">
        <span>{note.title}</span>
        {note.prefix && reason && (
          <span className="font-normal wrap-break-word">
            {note.prefix}: {reason}
          </span>
        )}
      </div>
    </div>
  );
}
