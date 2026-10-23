import { TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { CouponForm } from "@/components/vendor/coupons/CouponForm";
import { CouponFormSkeleton } from "@/components/coupons/CouponFormSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add Coupon" };

const heading = (
  <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
      <TicketPercent aria-hidden className="size-5" strokeWidth={1.9} />
    </span>
    Coupon Setup
  </h1>
);

/** Seller Center › Coupon Manage › Add Coupon — the FORM half of the vendorcoupon design. */
export default async function AddCouponPage() {
  const user = await requireArea("VENDOR");
  const store = await prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId! }, select: { storeName: true } });

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Coupon Manage", href: "/vendor/coupons" }, { label: "Add Coupon" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={heading}
        loading={<CouponFormSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={TicketPercent} title="No coupons yet" description="Create a coupon to reward loyal buyers or waive shipping. It goes live on your store the moment its start date arrives." />
          </section>
        }
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        <CouponForm storeName={store.storeName} />
      </PreviewStateFrame>
    </>
  );
}
