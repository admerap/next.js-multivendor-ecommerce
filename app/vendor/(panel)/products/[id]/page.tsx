import { Boxes, CircleCheck, Clock3, Eye, EyeOff, Package, SquarePen, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
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
import { requireArea } from "@/lib/auth-guard";
import { getProductDetail, type ProductDetail } from "@/lib/product-detail.server";
import { cn } from "@/lib/utils";
import { UNIT_LABELS, type ProductUnitValue } from "@/lib/validations/product";

export const metadata: Metadata = { title: "Product Details" };

/** What the vendor needs to know about visibility, from the two separate statuses. */
function StatusNote({ p }: { p: ProductDetail }) {
  const note =
    p.approvalStatus === "PENDING"
      ? { tone: "bg-warning-50 text-warning-600", icon: Clock3, text: "Waiting for approval — shoppers can't see this product until the marketplace team approves it." }
      : p.approvalStatus === "REJECTED"
        ? { tone: "bg-error-50 text-error-600", icon: TriangleAlert, text: "Denied — edit the product and update it to send it back for approval." }
        : !p.isActive
          ? { tone: "border border-line bg-card text-fg-muted", icon: EyeOff, text: "Approved but hidden — turn it on in the Product List to show it in your store." }
          : { tone: "bg-success-50 text-success-600", icon: CircleCheck, text: "Live — approved and visible in your store." };
  const Icon = note.icon;
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-md px-4 py-3 text-sm font-semibold", note.tone)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
      <div className="flex min-w-0 flex-col gap-1">
        <span>{note.text}</span>
        {/* The admin's note from the review (denied products only). */}
        {p.approvalStatus === "REJECTED" && p.rejectionReason && <span className="font-normal wrap-break-word">Reason: {p.rejectionReason}</span>}
      </div>
    </div>
  );
}

/**
 * Seller Center › Product Manage › Product Details. Loaded with the session's vendorId, so another
 * store's product (or a wrong id) is a 404.
 */
export default async function ProductDetailsPage({ params }: PageProps<"/vendor/products/[id]">) {
  const user = await requireArea("VENDOR");
  const { id } = await params;
  const p = await getProductDetail(id, user.vendorId!);
  if (!p) notFound();

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Product List", href: "/vendor/products" }, { label: "Product Details" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
                <Eye aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
              Product Details
            </h1>
            <p className="text-sm text-fg-muted">
              Added {shortDate.format(p.createdAt)} · Updated {shortDate.format(p.updatedAt)}
            </p>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2.5 max-sm:w-full max-sm:*:flex-1">
            <Button asChild>
              <Link href={`/vendor/products/${p.id}/edit`} className="!text-on-primary">
                <SquarePen aria-hidden />
                Edit product
              </Link>
            </Button>
            <DeleteProductButton id={p.id} name={p.name} labeled redirectTo="/vendor/products" />
          </div>
        }
        loading={<ProductDetailSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={Package} title="Product not found" description="This product doesn't exist in your store, or it was deleted." />
          </section>
        }
        error={{ title: "Couldn't load this product", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        <StatusNote p={p} />
        <ProductOverview p={p} />
        {p.variations.length > 0 && <ProductVariations p={p} />}
        <ProductDescription p={p} />
        <div className="grid gap-5 lg:grid-cols-2">
          <SeoPreview p={p} />
          <VideoCard url={p.videoUrl} emptyText="Add a YouTube embed link when you edit this product." />
        </div>
        <DetailCard title="Record" icon={Boxes}>
          <dl className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 lg:grid-cols-4">
            <Detail label="Created">{dateFmt.format(p.createdAt)}</Detail>
            <Detail label="Last updated">{dateFmt.format(p.updatedAt)}</Detail>
            <Detail label="Unit">{UNIT_LABELS[p.unit as ProductUnitValue] ?? p.unit}</Detail>
            <Detail label="Slug">{p.slug}</Detail>
          </dl>
        </DetailCard>
      </PreviewStateFrame>
    </>
  );
}
