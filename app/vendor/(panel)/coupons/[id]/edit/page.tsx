import { TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { CouponForm } from "@/components/vendor/coupons/CouponForm";
import { CouponFormSkeleton } from "@/components/coupons/CouponFormSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { getCouponForEdit } from "@/lib/coupon-edit.server";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit Coupon" };

/**
 * Seller Center › Coupon Manage › Edit Coupon (vendorcoupon form in edit mode). Loaded with the
 * session's vendorId — another store's coupon (or a wrong id) is a 404.
 */
export default async function EditCouponPage({ params }: PageProps<"/vendor/coupons/[id]/edit">) {
  const user = await requireArea("VENDOR");
  const { id } = await params;
  const [coupon, store] = await Promise.all([
    getCouponForEdit(id, user.vendorId!),
    prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId! }, select: { storeName: true } }),
  ]);
  if (!coupon) notFound();

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Coupon List", href: "/vendor/coupons" }, { label: "Edit Coupon" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
              <TicketPercent aria-hidden className="size-5" strokeWidth={1.9} />
            </span>
            Coupon Setup
          </h1>
        }
        loading={<CouponFormSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={TicketPercent} title="Coupon not found" description="This coupon doesn't exist in your store, or it was deleted." />
          </section>
        }
        error={{ title: "Couldn't load this coupon", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {coupon.approvalStatus === "PENDING" && (
          <p role="note" className="rounded-md bg-warning-50 px-4 py-3 text-sm text-warning-600">
            Waiting for approval — shoppers can&apos;t use this coupon until the Sundry team approves it.
          </p>
        )}
        {coupon.approvalStatus === "REJECTED" && (
          <p role="note" className="rounded-md bg-warning-50 px-4 py-3 text-sm text-warning-600">
            This coupon was denied. Fix it and click Update — it goes back to the Sundry team for approval.
            {coupon.rejectionReason && <span className="mt-1 block font-semibold wrap-break-word">Reason: {coupon.rejectionReason}</span>}
          </p>
        )}
        {coupon.approvalStatus === "APPROVED" && (
          <p role="note" className="rounded-md bg-info-50 px-4 py-3 text-sm text-info-600">
            Changes to the code, type, discount, minimum or maximum, dates or products send this coupon back for approval. The title, usage limits and the on/off switch don&apos;t.
          </p>
        )}
        {coupon.usedCount > 0 && (
          <p role="note" className="rounded-md bg-info-50 px-4 py-3 text-sm text-info-600">
            This coupon has been used {coupon.usedCount} {coupon.usedCount === 1 ? "time" : "times"}. Changes apply to future orders only.
          </p>
        )}
        <CouponForm storeName={store.storeName} edit={coupon} />
      </PreviewStateFrame>
    </>
  );
}
