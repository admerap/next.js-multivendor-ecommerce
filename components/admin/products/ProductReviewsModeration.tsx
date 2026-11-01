"use client";

import { Check, MessageSquareText, Star, X } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/data/DashCard";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { Button } from "@/components/ui/button";
import { moderateReviewAction } from "@/lib/actions/admin-reviews";
import type { AdminProductReview } from "@/lib/reviews.server";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Admin › Product details › Product reviews: every review of this product (pending first) with Approve /
 * Deny. Approved reviews show on the storefront and count toward the product's stars; denied ones are
 * hidden. A decision can be changed later (e.g. approve a review that was denied by mistake).
 */
export function ProductReviewsModeration({ reviews }: { reviews: AdminProductReview[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setBusy(id);
    start(async () => {
      const res = await moderateReviewAction({ id, decision }).catch(() => ({ success: false as const, error: "We couldn't reach the server. Please try again." }));
      setBusy(null);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === "APPROVED" ? "Review approved — it now shows on the product page" : "Review denied — it's hidden from the storefront");
    });
  }

  if (reviews.length === 0) {
    return <EmptyState bare icon={MessageSquareText} title="No reviews yet" description="Reviews appear here after customers receive this product." />;
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {reviews.map((r) => (
        <li key={r.id} aria-label={`Review by ${r.customerName}`} className={cn("rounded-md border p-4", r.status === "PENDING" ? "border-warning-500/40 bg-warning-50/40" : "border-line")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} aria-hidden className={cn("size-4", n <= r.rating ? "fill-warning-500 text-warning-500" : "text-line-default")} strokeWidth={1.6} />
              ))}
            </span>
            <ApprovalBadge status={r.status} />
            <span className="text-caption text-fg-muted">
              {r.customerName} · {r.customerEmail} · Order #{r.orderNumber}
              {r.variationName ? ` · ${r.variationName}` : ""} · {when.format(r.createdAt)}
            </span>
          </div>
          {r.title && <p className="mt-2 font-semibold text-fg-strong">{r.title}</p>}
          <p className="mt-1 text-sm whitespace-pre-line text-fg">{r.comment}</p>
          {r.photos.length > 0 && (
            <ul aria-label="Review photos" className="mt-3 flex flex-wrap gap-2">
              {r.photos.map((src, i) => (
                <li key={src} className="relative size-16 overflow-hidden rounded-md border border-line bg-sunken">
                  <a href={src} target="_blank" rel="noreferrer" aria-label={`Open photo ${i + 1}`}>
                    <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {r.status !== "APPROVED" && (
              <Button type="button" size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "APPROVED")} className="max-lg:h-11">
                <Check aria-hidden />
                Approve
              </Button>
            )}
            {r.status !== "REJECTED" && (
              <Button type="button" size="sm" variant="secondary" disabled={busy === r.id} onClick={() => decide(r.id, "REJECTED")} className="text-error-600 hover:border-error-500 max-lg:h-11">
                <X aria-hidden />
                Deny
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
