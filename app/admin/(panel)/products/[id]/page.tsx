import { Boxes, Eye, MessageSquareText, Package, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductFlagToggle } from "@/components/admin/products/ProductFlagToggle";
import { ProductReviewActions } from "@/components/admin/products/ProductReviewActions";
import { ProductReviewsModeration } from "@/components/admin/products/ProductReviewsModeration";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { ProductDetailSkeleton } from "@/components/products/detail/ProductDetailSkeleton";
import {
  dateFmt,
  Detail,
  DetailCard,
  ProductDescription,
  ProductOverview,
  ProductVariations,
  SeoPreview,
  shortDate,
  VideoCard,
} from "@/components/products/detail/ProductDetailSections";
import { requirePermission } from "@/lib/access.server";
import { getAdminProductDetail, type ProductDetail } from "@/lib/product-detail.server";
import { adminProductReviews } from "@/lib/reviews.server";
import { adminProductIdSchema } from "@/lib/validations/admin-product";
import { UNIT_LABELS, type ProductUnitValue } from "@/lib/validations/product";
import { ReviewNote } from "@/components/admin/review/ReviewNote";
import { countOf, VendorCard } from "@/components/admin/review/VendorCard";

export const metadata: Metadata = { title: "Product Details" };

/** The Product Manage list a product belongs to, for the breadcrumb and the redirect after deleting. */
const LIST = {
  PENDING: { label: "Pending Products", href: "/admin/products/pending" },
  APPROVED: { label: "Approved Products", href: "/admin/products/approved" },
  REJECTED: { label: "Denied Products", href: "/admin/products/denied" },
} as const;

const FLAGS = [
  { flag: "isFeatured", description: "Shown in the storefront's featured sections." },
  { flag: "isPopular", description: "Shown in the storefront's most popular sections." },
] as const;

/**
 * Featured / Most Popular, always visible here; the boxes unlock as soon as the product is approved
 * (Approve refreshes the page). A flag kept from before can still be removed while pending/denied.
 */
function MerchandisingCard({ p }: { p: ProductDetail }) {
  const approved = p.approvalStatus === "APPROVED";
  return (
    <DetailCard title="Storefront placement" icon={Sparkles}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {FLAGS.map(({ flag, description }) => (
          <ProductFlagToggle key={flag} id={p.id} name={p.name} flag={flag} checked={p[flag]} approved={approved} description={description} />
        ))}
      </div>
      {!approved && (p.isFeatured || p.isPopular) && (
        <p className="mt-3 text-caption text-fg-muted">Kept from before — not shown on the storefront until the product is approved again. You can remove it.</p>
      )}
    </DetailCard>
  );
}

/**
 * Product Manage › Product Details (adminproductdetail design): any store's product, with Approve,
 * Deny (reason for the store), Delete, and the Featured / Most Popular placement flags.
 */
export default async function AdminProductDetailsPage({ params }: PageProps<"/admin/products/[id]">) {
  await requirePermission("products");
  const parsed = adminProductIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const p = await getAdminProductDetail(parsed.data.id);
  if (!p) notFound();
  const list = LIST[p.approvalStatus];
  const reviews = await adminProductReviews(p.id);
  const pendingReviews = reviews.filter((r) => r.status === "PENDING").length;
  const approved = reviews.filter((r) => r.status === "APPROVED");
  const average = approved.length ? approved.reduce((n, r) => n + r.rating, 0) / approved.length : 0;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Product Manage" }, list, { label: "Product Details" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
                <Eye aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
              Product Details
              <ApprovalBadge status={p.approvalStatus} />
            </h1>
            <p className="text-sm text-fg-muted">
              Submitted {shortDate.format(p.submittedAt)} by{" "}
              <Link href={`/admin/vendors/${p.vendor.id}`} className="font-semibold max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                {p.vendor.storeName}
              </Link>{" "}
              · SKU {p.sku}
            </p>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2.5 max-sm:w-full max-sm:*:flex-1">
            <ProductReviewActions id={p.id} name={p.name} vendorName={p.vendor.storeName} status={p.approvalStatus} />
            <DeleteProductButton id={p.id} name={p.name} labeled scope="admin" redirectTo={list.href} />
          </div>
        }
        loading={<ProductDetailSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={Package} title="Product not found" description="It may have been deleted by the store or already moved to another list." />
          </section>
        }
        error={{ title: "Couldn't load this product", description: "The catalog service didn't respond. Check your connection and try again." }}
      >
        <ReviewNote noun="product" status={p.approvalStatus} reason={p.rejectionReason} hiddenByVendor={!p.isActive} />
        <ProductOverview p={p} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <VendorCard vendor={p.vendor} countLabel={countOf(p.vendor._count.products, "product")} />
          <MerchandisingCard p={p} />
        </div>
        {p.variations.length > 0 && <ProductVariations p={p} />}
        <ProductDescription p={p} />
        <div className="grid gap-5 lg:grid-cols-2">
          <SeoPreview p={p} />
          <VideoCard url={p.videoUrl} emptyText="The store didn't include a YouTube link for this product." />
        </div>
        {/* Customer reviews of this product, with Approve / Deny (moderation). */}
        <DetailCard
          title="Product reviews"
          icon={MessageSquareText}
          aside={
            reviews.length > 0 && (
              <span className="text-caption text-fg-muted">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                {pendingReviews > 0 && <b className="ml-1.5 font-semibold text-warning-600">· {pendingReviews} pending</b>}
                {approved.length > 0 && (
                  <span className="ml-1.5">
                    · {average.toFixed(1)} ★ from {approved.length} approved
                  </span>
                )}
              </span>
            )
          }
        >
          <ProductReviewsModeration reviews={reviews} />
        </DetailCard>
        <DetailCard title="Record" icon={Boxes}>
          <dl className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 lg:grid-cols-5">
            <Detail label="Created">{dateFmt.format(p.createdAt)}</Detail>
            <Detail label="Submitted for review">{dateFmt.format(p.submittedAt)}</Detail>
            <Detail label="Last updated">{dateFmt.format(p.updatedAt)}</Detail>
            <Detail label="Unit">{UNIT_LABELS[p.unit as ProductUnitValue] ?? p.unit}</Detail>
            <Detail label="Slug">{p.slug}</Detail>
          </dl>
        </DetailCard>
      </PreviewStateFrame>
    </>
  );
}
