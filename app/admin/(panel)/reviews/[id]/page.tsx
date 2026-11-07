import { ArrowLeft, BadgeCheck, ExternalLink, EyeOff, Gavel, Package, ShoppingBag, Star, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewModeration } from "@/components/admin/reviews/ReviewModeration";
import { StarRating } from "@/components/commerce/StarRating";
import { Facts, SideCard } from "@/components/orders/DetailCards";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/access.server";
import { getAdminReview } from "@/lib/admin-reviews.server";
import { money } from "@/lib/money";
import { adminOrderHref, orderDate } from "@/lib/orders";
import { productHref } from "@/lib/storefront";
import { ADMIN_REVIEW_STATUS_LABEL, ADMIN_REVIEW_STATUS_TONE, reviewRef } from "@/lib/validations/admin-review";

export const metadata: Metadata = { title: "Review Details" };

const at = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * Admin › Review Manage › Review details: the full review, its product and customer, and the purchase
 * it's tied to (verified buyer), with the moderation controls. Unknown id → 404.
 */
export default async function AdminReviewPage({ params }: PageProps<"/admin/reviews/[id]">) {
  await requirePermission("reviews");
  const { id } = await params;
  const r = /^[a-z0-9]{1,40}$/i.test(id) ? await getAdminReview(id) : null;
  if (!r) notFound();
  const ref = reviewRef(r.id);
  const onStorefront = r.product.approvalStatus === "APPROVED" && r.product.isActive;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Review Manage", href: "/admin/reviews" }, { label: `Review #${ref}` }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
            <Star aria-hidden className="size-5" strokeWidth={1.9} />
          </span>
          <span className="tabular-nums">Review #{ref}</span>
          <Badge tone={ADMIN_REVIEW_STATUS_TONE[r.status]}>{ADMIN_REVIEW_STATUS_LABEL[r.status]}</Badge>
          {r.status === "APPROVED" && !r.isVisible && (
            <Badge tone="neutral">
              <EyeOff aria-hidden className="size-3.5" />
              Hidden
            </Badge>
          )}
        </h1>
        <Button asChild variant="secondary" className="max-sm:w-full">
          <Link href="/admin/reviews">
            <ArrowLeft aria-hidden />
            Back to reviews
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* The review */}
        <section aria-label="Review" className="min-w-0 rounded-lg bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StarRating value={r.rating} size="lg" />
            <span className="text-sm font-bold text-fg-strong tabular-nums">{r.rating}.0 out of 5</span>
          </div>
          {r.title && <h2 className="mt-3 font-display text-xl font-bold text-fg-strong">{r.title}</h2>}
          <p className="mt-2 text-[0.95rem] leading-relaxed whitespace-pre-line text-fg">{r.comment}</p>
          {r.reply && (
            <div className="mt-4 rounded-md border-l-2 border-primary bg-iris-50 px-4 py-3">
              <p className="text-caption font-bold text-primary">
                Response from {r.product.vendor.storeName}
                {r.repliedAt && <span className="font-normal text-fg-muted"> · {orderDate(r.repliedAt)}</span>}
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-fg">{r.reply}</p>
            </div>
          )}
          {r.photos.length > 0 && (
            <ul aria-label="Review photos" className="mt-5 flex flex-wrap gap-3">
              {r.photos.map((src, i) => (
                <li key={src}>
                  <a href={src} target="_blank" rel="noreferrer" className="relative block size-28 overflow-hidden rounded-md border border-line" aria-label={`Open photo ${i + 1} of ${r.photos.length}`}>
                    <Image src={src} alt={`Review photo ${i + 1}`} fill sizes="112px" className="object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 border-t border-line pt-4 text-caption text-fg-muted tabular-nums">
            Written {orderDate(r.createdAt)} · {at.format(r.createdAt)} by <b className="text-fg-strong">{r.customer.name}</b>
            {r.moderatedAt && (
              <>
                {" "}
                · {r.status === "APPROVED" ? "approved" : r.status === "REJECTED" ? "denied" : "moderated"} {orderDate(r.moderatedAt)}
              </>
            )}
          </p>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <SideCard icon={Gavel} title="Moderation">
            <ReviewModeration key={`${r.status}-${r.isVisible}`} id={r.id} status={r.status} isVisible={r.isVisible} />
          </SideCard>

          <SideCard icon={BadgeCheck} title="Verified purchase">
            <Facts
              rows={[
                [
                  "Order",
                  <Link key="o" href={adminOrderHref(r.purchase.orderNumber)} className="inline-flex items-center !text-primary tabular-nums hover:underline max-lg:min-h-11">
                    #{r.purchase.orderNumber}
                  </Link>,
                ],
                ["Ordered", <span key="d" className="tabular-nums">{orderDate(r.purchase.orderedAt)}</span>],
                ["Delivered", r.purchase.deliveredAt ? <span key="dl" className="tabular-nums">{orderDate(r.purchase.deliveredAt)}</span> : "—"],
                ["Store status", <OrderStatusBadge key="s" status={r.purchase.status} />],
                ["Item", `${r.purchase.productName}${r.purchase.variationName ? ` · ${r.purchase.variationName}` : ""}`],
                ["Qty × price", <span key="q" className="tabular-nums">{r.purchase.qty} × {money(r.purchase.unitPrice)}</span>],
              ]}
            />
          </SideCard>

          <SideCard icon={Package} title="Product">
            <div className="flex items-center gap-3">
              <ProductThumb src={r.product.thumbnail} name={r.product.name} size={48} />
              <div className="min-w-0">
                <Link href={`/admin/products/${r.product.id}`} className="line-clamp-2 text-sm font-semibold !text-fg-strong hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                  {r.product.name}
                </Link>
                <p className="text-caption text-fg-muted">
                  Sold by{" "}
                  <Link href={`/admin/vendors/${r.product.vendor.id}`} className="inline-flex items-center font-semibold !text-primary hover:underline max-lg:min-h-11">
                    {r.product.vendor.storeName}
                  </Link>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Facts
                rows={[
                  ["Stars on the storefront", r.product.reviewCount ? <StarRating key="s" value={r.product.ratingAvg / 100} count={r.product.reviewCount} /> : "No published reviews"],
                  ["SKU", r.product.sku],
                ]}
              />
            </div>
            {onStorefront && (
              <Button asChild variant="secondary" className="mt-4 w-full">
                <a href={productHref(r.product.slug)} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden />
                  View on storefront
                </a>
              </Button>
            )}
          </SideCard>

          <SideCard icon={UserRound} title="Customer">
            <Facts
              rows={[
                [
                  "Name",
                  <Link key="n" href={`/admin/customers/${r.customer.id}`} className="inline-flex items-center !text-primary hover:underline max-lg:min-h-11">
                    {r.customer.name}
                  </Link>,
                ],
                ["Email", <span key="e" className="break-all">{r.customer.email}</span>],
                ["Phone", r.customer.phone || "—"],
                ["Customer since", orderDate(r.customer.createdAt)],
              ]}
            />
            <p className="mt-3 inline-flex items-center gap-1.5 text-caption font-semibold text-success-600">
              <ShoppingBag aria-hidden className="size-3.5" strokeWidth={2} />
              Bought this product
            </p>
          </SideCard>
        </div>
      </div>
    </>
  );
}
