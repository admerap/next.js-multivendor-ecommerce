import { ArrowRight, ChevronRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid, productGridClass } from "@/components/home/HomeSection";
import { Skeleton } from "@/components/states/Skeleton";
import { money } from "@/lib/money";
import { productHref, sellerHref, type ProductPageData } from "@/lib/storefront";
import { getMoreFromVendor, getSimilarProducts } from "@/lib/storefront.server";
import { cn } from "@/lib/utils";
import { pageContainer } from "./ProductPageSections";

/**
 * Right-rail "More From The Store" (Product Detail Page design): the same store's other visible products
 * as compact rows. Hidden when the store has nothing else on sale.
 */
export async function MoreFromStore({ product: p }: { product: ProductPageData }) {
  const items = await getMoreFromVendor(p.seller.id, p.id, 5);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="more-from-store" className="rounded-lg bg-card p-5 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 id="more-from-store" className="font-display text-[1.06rem] font-extrabold text-fg-strong">
          More From The Store
        </h2>
        <Link href={sellerHref(p.seller.slug)} className="inline-flex shrink-0 items-center gap-0.5 text-[0.81rem] font-semibold !text-primary hover:underline max-lg:min-h-11">
          View All
          <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.id}>
            <Link href={productHref(it.slug)} className="group flex items-center gap-3.5 rounded-md bg-sunken p-3 transition-colors duration-(--dur-fast) hover:bg-iris-50">
              <span className="relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-sm bg-iris-50">
                {it.image ? <Image src={it.image} alt="" fill sizes="52px" className="object-cover" /> : <Package aria-hidden className="size-6 text-iris-400" strokeWidth={1.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-snug font-semibold text-fg-strong group-hover:text-primary">{it.name}</span>
                <span className="mt-0.5 flex items-baseline gap-2 tabular-nums">
                  <b className="text-sm font-extrabold text-primary">{money(it.price)}</b>
                  {it.compareAt !== null && <s className="text-caption text-fg-compare">{money(it.compareAt)}</s>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MoreFromStoreSkeleton() {
  return (
    <div role="status" aria-label="Loading more from the store" className="rounded-lg bg-card p-5 shadow-sm">
      <Skeleton className="mb-4 h-5 w-40 rounded-sm" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-19 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * "Similar Products" (Product Detail Page design): visible products from the same sub-sub-category, then
 * sub-category, then category (getSimilarProducts), as regular product cards. Hidden when there are none.
 */
export async function SimilarProducts({ product: p }: { product: ProductPageData }) {
  const items = await getSimilarProducts(p.catalog, p.id, 10);
  if (items.length === 0) return null;
  // "View All" opens the most specific category shown in the breadcrumb.
  const viewAll = p.categoryPath[p.categoryPath.length - 1]!.href;
  return (
    <section aria-labelledby="similar-products" className={cn(pageContainer, "pt-11")}>
      <div className="rounded-lg bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="similar-products" className="font-display text-[clamp(1.3rem,3vw,1.5rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            Similar Products
          </h2>
          <Link href={viewAll} className="group inline-flex items-center gap-1 text-sm font-semibold !text-primary max-lg:min-h-11">
            View All
            <ArrowRight aria-hidden className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>
        <ProductGrid products={items} />
      </div>
    </section>
  );
}

export function SimilarProductsSkeleton() {
  return (
    <div role="status" aria-label="Loading similar products" className={cn(pageContainer, "pt-11")}>
      <div className="rounded-lg bg-card p-5 shadow-sm sm:p-7">
        <Skeleton className="mb-5 h-7 w-52 rounded-md" />
        <div className={productGridClass}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-sunken">
              <Skeleton className="aspect-square w-full" />
              <div className="flex flex-col gap-2 p-3.5">
                <Skeleton className="h-3 w-1/3 rounded-sm" />
                <Skeleton className="h-3.5 w-full rounded-sm" />
                <Skeleton className="mt-2 h-5 w-1/3 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
