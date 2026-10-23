import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryRails } from "@/components/home/CategoryRails";
import { FeaturedDeals, FeaturedDealsSkeleton } from "@/components/home/FeaturedDeals";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { FlashDeal } from "@/components/home/FlashDeal";
import { HomeHero } from "@/components/home/HomeHero";
import { ProductGridSkeleton } from "@/components/home/HomeSection";
import { LatestProducts } from "@/components/home/LatestProducts";
import { NewArrivals } from "@/components/home/NewArrivals";
import { PopularProducts } from "@/components/home/PopularProducts";
import { ShopByBrand } from "@/components/home/ShopByBrand";
import { ShopByCategory, ShopByCategorySkeleton } from "@/components/home/ShopByCategory";
import { TopSellers } from "@/components/home/TopSellers";
import { TrustBadges } from "@/components/home/TrustBadges";
import { Skeleton } from "@/components/states/Skeleton";
import { getCategoryTree } from "@/lib/catalog.server";

export const metadata: Metadata = { title: "Sundry — One marketplace. Every seller you love." };

function BlockSkeleton({ label, height }: { label: string; height: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-[clamp(32px,6vw,56px)]">
      <Skeleton className={`${height} w-full rounded-xl`} />
    </div>
  );
}

/**
 * Storefront home (Sundry Home design), in the design's section order. Each section streams on its own
 * (Suspense + skeleton) and shows an empty state when the catalog has nothing for it yet.
 * Header/footer come from (storefront)/layout.
 */
export default async function HomePage() {
  const tree = await getCategoryTree();
  return (
    <main className="flex flex-col pb-4">
      <HomeHero tree={tree} />
      <Suspense fallback={<BlockSkeleton label="Loading flash deals" height="h-[clamp(320px,40vw,460px)]" />}>
        <FlashDeal />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton label="Loading featured products" />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<ShopByCategorySkeleton />}>
        <ShopByCategory />
      </Suspense>
      <Suspense fallback={<FeaturedDealsSkeleton />}>
        <FeaturedDeals />
      </Suspense>
      <Suspense fallback={<BlockSkeleton label="Loading top sellers" height="h-56" />}>
        <TopSellers />
      </Suspense>
      <Suspense fallback={<BlockSkeleton label="Loading latest products" height="h-[560px]" />}>
        <LatestProducts />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton label="Loading new arrivals" />}>
        <NewArrivals />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton label="Loading popular products" />}>
        <PopularProducts />
      </Suspense>
      <Suspense fallback={<BlockSkeleton label="Loading brands" height="h-44" />}>
        <ShopByBrand />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton label="Loading category products" />}>
        <CategoryRails />
      </Suspense>
      <TrustBadges />
    </main>
  );
}
