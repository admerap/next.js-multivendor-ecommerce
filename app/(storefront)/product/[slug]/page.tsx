import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductHero } from "@/components/commerce/product/ProductHero";
import { HelpCards, pageContainer, ProductBreadcrumb, ProductOverview, ProductTrust } from "@/components/commerce/product/ProductPageSections";
import { MoreFromStore, MoreFromStoreSkeleton, SimilarProducts, SimilarProductsSkeleton } from "@/components/commerce/product/ProductRelated";
import { ProductReviews } from "@/components/commerce/product/ProductReviews";
import { ProductSeller } from "@/components/commerce/product/ProductSeller";
import { ProductTabs } from "@/components/commerce/product/ProductTabs";
import { productHref } from "@/lib/storefront";
import { getProductBySlug, getProductReviews, getVendorForProduct } from "@/lib/storefront.server";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

/** SEO from the vendor's meta fields (fallbacks in getProductBySlug). Shares the cached query with the page. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  // The route streams (loading.tsx), so Next answers a missing product with the not-found page +
  // <meta name="robots" content="noindex"> instead of an HTTP 404 status.
  if (!p) notFound();
  return {
    title: p.meta.title,
    description: p.meta.description,
    alternates: { canonical: productHref(p.slug) },
    openGraph: { title: p.meta.title, description: p.meta.description, images: p.meta.image ? [p.meta.image] : undefined },
  };
}

/**
 * Product details (Product Detail Page design). Only VISIBLE products render — anything else (pending,
 * denied, hidden, suspended store, unknown slug) is a 404, even by direct link.
 */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [store, reviews] = await Promise.all([getVendorForProduct(p.seller.id), getProductReviews(p.id)]);

  return (
    <main className="pb-4">
      <ProductBreadcrumb product={p} />
      <div className={cn(pageContainer, "flex flex-wrap items-start gap-6 pt-5")}>
        <div className="flex min-w-0 flex-[3_1_640px] flex-col gap-6">
          <ProductHero product={p} />
          <ProductTabs overview={<ProductOverview product={p} />} reviews={<ProductReviews summary={reviews} />} reviewCount={reviews.count} />
        </div>
        <aside aria-label="Seller and delivery" className="flex min-w-0 flex-[1_1_280px] flex-col gap-5 lg:max-w-85">
          <ProductTrust />
          {store && <ProductSeller store={store} />}
          <Suspense fallback={<MoreFromStoreSkeleton />}>
            <MoreFromStore product={p} />
          </Suspense>
        </aside>
      </div>
      <Suspense fallback={<SimilarProductsSkeleton />}>
        <SimilarProducts product={p} />
      </Suspense>
      <HelpCards />
    </main>
  );
}
