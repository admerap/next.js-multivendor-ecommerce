import { FolderTree, SquarePen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { ProductForm } from "@/components/vendor/products/form/ProductForm";
import { ProductFormSkeleton } from "@/components/vendor/products/form/ProductFormSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { getProductForEdit } from "@/lib/product-edit.server";

export const metadata: Metadata = { title: "Product Edit" };

/**
 * Seller Center › Product Manage › Product Edit (vendoreditproduct design). The product is loaded
 * with the session's vendorId, so another store's product id is a 404 — never shown or editable.
 */
export default async function EditProductPage({ params }: PageProps<"/vendor/products/[id]/edit">) {
  const user = await requireArea("VENDOR");
  const { id } = await params;
  const [product, store, categories] = await Promise.all([
    getProductForEdit(id, user.vendorId!),
    prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId! }, select: { storeName: true } }),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Product List", href: "/vendor/products" }, { label: "Product Edit" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
                <SquarePen aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
              Product Edit
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="truncate font-semibold text-fg-strong">{product.name}</span>
              <ApprovalBadge status={product.approvalStatus} />
            </p>
          </div>
        }
        loading={<ProductFormSkeleton />}
        empty={
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={FolderTree} title="Set up categories first" description="There are no active categories to list products under yet. Contact Sundry support to enable categories for your store." />
          </section>
        }
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {product.approvalStatus === "APPROVED" && (
          <p role="note" className="rounded-md bg-info-50 px-4 py-3 text-sm text-info-600">
            Changes to the name, description, price, images, category or variations send this product back for approval. Stock, SKU, shipping and SEO changes don&apos;t.
          </p>
        )}
        {product.approvalStatus === "REJECTED" && (
          <p role="note" className="rounded-md bg-warning-50 px-4 py-3 text-sm text-warning-600">
            This product was denied. Fix it and click Update — it goes back to the marketplace team for approval.
            {product.rejectionReason && <span className="mt-1 block font-semibold wrap-break-word">Reason: {product.rejectionReason}</span>}
          </p>
        )}
        <ProductForm storeName={store.storeName} categories={categories} brandLabel={product.brandLabel} initial={product.initial} edit={product.edit} />
      </PreviewStateFrame>
    </>
  );
}
