import { FolderTree, List, PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/vendor/products/form/ProductForm";
import { ProductFormSkeleton } from "@/components/vendor/products/form/ProductFormSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add New Product" };

const heading = (
  <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
      <PackagePlus aria-hidden className="size-5" strokeWidth={1.9} />
    </span>
    Add New Product
  </h1>
);

function NoCategories() {
  return (
    <section className="rounded-lg bg-card shadow-sm">
      <EmptyState bare icon={FolderTree} title="Set up categories first" description="There are no active categories to list products under yet. Contact Sundry support to enable categories for your store.">
        <Button asChild>
          <Link href="/vendor/products" className="!text-on-primary">
            <List aria-hidden />
            Open Product List
          </Link>
        </Button>
      </EmptyState>
    </section>
  );
}

/** Seller Center › Product Manage › Add Product (vendoraddproduct design). */
export default async function AddProductPage() {
  const user = await requireArea("VENDOR");
  // Store from the session; only ACTIVE categories can be chosen (brands are searched on demand).
  const [store, categories] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId! }, select: { storeName: true } }),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Product Manage", href: "/vendor/products" }, { label: "Add Product" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={heading}
        loading={<ProductFormSkeleton />}
        empty={<NoCategories />}
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {categories.length === 0 ? <NoCategories /> : <ProductForm storeName={store.storeName} categories={categories} />}
      </PreviewStateFrame>
    </>
  );
}
