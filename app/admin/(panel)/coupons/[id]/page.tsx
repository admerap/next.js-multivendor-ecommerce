import { Boxes, Package, TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponReviewActions } from "@/components/admin/coupons/CouponReviewActions";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Badge } from "@/components/ui/badge";
import { CouponChip, CouponStatusBadge } from "@/components/coupons/CouponBits";
import { CouponFormSkeleton } from "@/components/coupons/CouponFormSkeleton";
import { DeleteCouponButton } from "@/components/coupons/DeleteCouponButton";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { dateFmt, Detail, DetailCard, shortDate } from "@/components/products/detail/ProductDetailSections";
import { requireArea } from "@/lib/auth-guard";
import { getAdminCouponDetail, type AdminCouponDetail } from "@/lib/coupon-detail.server";
import { couponDate } from "@/lib/coupons";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { adminCouponIdSchema } from "@/lib/validations/admin-coupon";
import { COUPON_SCOPE_LABELS, couponKindLabel } from "@/lib/validations/coupon";
import { ReviewNote } from "@/components/admin/review/ReviewNote";
import { countOf, VendorCard } from "@/components/admin/review/VendorCard";

export const metadata: Metadata = { title: "Coupon Details" };

/** The Coupon Manage list a coupon belongs to, for the breadcrumb and the redirect after deleting. */
const LIST = {
  PENDING: { label: "Pending Coupons", href: "/admin/coupons/pending" },
  APPROVED: { label: "Approved Coupons", href: "/admin/coupons/approved" },
  REJECTED: { label: "Denied Coupons", href: "/admin/coupons/denied" },
} as const;

/** What the coupon gives, in words ("15% off, up to $40.00"). */
function discountText(c: AdminCouponDetail) {
  if (c.type === "FREE_DELIVERY") return "Free shipping";
  if (c.discountType === "PERCENTAGE") return `${c.discountValue}% off${c.maxDiscount != null ? `, up to ${money(c.maxDiscount)}` : ""}`;
  return `${money(c.discountValue)} off`;
}

function Summary({ c }: { c: AdminCouponDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
      <CouponChip coupon={c} className="size-16 text-base" />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong wrap-break-word">{c.title}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-dashed border-line-strong px-2 py-0.5 font-bold tracking-[0.06em] text-fg-strong tabular-nums">{c.code}</span>
          <CouponStatusBadge status={c.status} />
          <ApprovalBadge status={c.approvalStatus} />
          <Badge tone={c.isActive ? "primary" : "neutral"}>{c.isActive ? "Switched on by vendor" : "Switched off by vendor"}</Badge>
        </div>
      </div>
      <p className="font-display text-h3 font-extrabold text-primary tabular-nums sm:text-right">{discountText(c)}</p>
    </section>
  );
}

function Terms({ c }: { c: AdminCouponDetail }) {
  return (
    <DetailCard title="Coupon terms" icon={TicketPercent}>
      <dl className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 lg:grid-cols-3">
        <Detail label="Coupon type">{couponKindLabel(c)}</Detail>
        <Detail label="Discount">{discountText(c)}</Detail>
        <Detail label="Applies to">{c.scope === "SPECIFIC_PRODUCTS" ? `${c.products.length} selected ${c.products.length === 1 ? "product" : "products"}` : COUPON_SCOPE_LABELS[c.scope]}</Detail>
        <Detail label="Minimum purchase">{c.minPurchase ? money(c.minPurchase) : "None"}</Detail>
        <Detail label="Maximum discount">{c.maxDiscount != null ? money(c.maxDiscount) : "No cap"}</Detail>
        <Detail label="Bearer">Seller</Detail>
        <Detail label="Starts">{couponDate(c.startsAt, true)}</Detail>
        <Detail label="Expires">{couponDate(c.expiresAt, true)}</Detail>
        <Detail label="Times used">{`${c.usedCount.toLocaleString("en-US")}${c.usageLimit ? ` of ${c.usageLimit.toLocaleString("en-US")}` : ""}`}</Detail>
        <Detail label="Total usage limit">{c.usageLimit?.toLocaleString("en-US") ?? "No limit"}</Detail>
        <Detail label="Limit per customer">{c.limitPerUser?.toLocaleString("en-US") ?? "No limit"}</Detail>
      </dl>
    </DetailCard>
  );
}

function Products({ c }: { c: AdminCouponDetail }) {
  return (
    <DetailCard title={`Products (${c.products.length})`} icon={Package}>
      <ul role="list" aria-label="Products this coupon applies to" className="flex flex-col divide-y divide-line">
        {c.products.map((p) => (
          <li key={p.id} className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <ProductThumb src={p.thumbnail} name={p.name} size={44} />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/products/${p.id}`} className="flex min-h-11 min-w-0 items-center text-sm font-bold !text-fg-strong hover:!text-primary sm:block sm:min-h-0">
                <span className="block truncate">{p.name}</span>
              </Link>
              <span className="block truncate text-caption text-fg-muted tabular-nums">SKU {p.sku}</span>
            </div>
            <ApprovalBadge status={p.approvalStatus} />
          </li>
        ))}
      </ul>
    </DetailCard>
  );
}

/** Coupon Manage › Coupon Details: any store's coupon with Approve, Deny (reason for the store) and Delete. */
export default async function AdminCouponDetailsPage({ params }: PageProps<"/admin/coupons/[id]">) {
  await requireArea("ADMIN");
  const parsed = adminCouponIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const c = await getAdminCouponDetail(parsed.data.id);
  if (!c) notFound();
  const list = LIST[c.approvalStatus];

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Coupon Manage" }, list, { label: "Coupon Details" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
                <TicketPercent aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
              Coupon Details
              <ApprovalBadge status={c.approvalStatus} />
            </h1>
            <p className="text-sm text-fg-muted">
              Submitted {shortDate.format(c.submittedAt)} by{" "}
              <Link href={`/admin/vendors/${c.vendor.id}`} className="font-semibold max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                {c.vendor.storeName}
              </Link>{" "}
              · Code {c.code}
            </p>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2.5 max-sm:w-full max-sm:*:flex-1">
            <CouponReviewActions id={c.id} code={c.code} vendorName={c.vendor.storeName} status={c.approvalStatus} />
            <DeleteCouponButton id={c.id} code={c.code} usedCount={c.usedCount} scope="admin" labeled redirectTo={list.href} />
          </div>
        }
        loading={<CouponFormSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={TicketPercent} title="Coupon not found" description="It may have been deleted by the store or already moved to another list." />
          </section>
        }
        error={{ title: "Couldn't load this coupon", description: "The marketplace didn't respond. Check your connection and try again." }}
      >
        <ReviewNote noun="coupon" status={c.approvalStatus} reason={c.rejectionReason} />
        <Summary c={c} />
        <Terms c={c} />
        <div className={cn("grid gap-5", c.scope === "SPECIFIC_PRODUCTS" && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
          {c.scope === "SPECIFIC_PRODUCTS" && <Products c={c} />}
          <div className="flex min-w-0 flex-col gap-5">
            <VendorCard vendor={c.vendor} countLabel={countOf(c.vendor._count.coupons, "coupon")} />
            <DetailCard title="Record" icon={Boxes}>
              <dl className="grid grid-cols-1 gap-2.5 xs:grid-cols-2">
                <Detail label="Created">{dateFmt.format(c.createdAt)}</Detail>
                <Detail label="Submitted for review">{dateFmt.format(c.submittedAt)}</Detail>
                <Detail label="Last updated">{dateFmt.format(c.updatedAt)}</Detail>
              </dl>
            </DetailCard>
          </div>
        </div>
      </PreviewStateFrame>
    </>
  );
}
