import { LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/states/Skeleton";
import { categoryHref } from "@/lib/catalog";
import { getCategoriesWithCount } from "@/lib/storefront.server";
import { HomeSection, SectionEmpty, SectionHeading } from "./HomeSection";

const gridClass = "grid gap-[clamp(10px,2vw,16px)] grid-cols-[repeat(auto-fill,minmax(min(130px,calc(33.3%_-_11px)),1fr))]";

/** Shop by Category: every active category as an IMAGE tile + name + how many products it holds. */
export async function ShopByCategory() {
  const categories = await getCategoriesWithCount();
  return (
    <HomeSection id="shop-by-category">
      <SectionHeading id="shop-by-category" eyebrow="Browse" title="Shop by Category" />
      {categories.length ? (
        <ul role="list" className={gridClass}>
          {categories.map((c) => (
            <li key={c.slug} className="min-w-0">
              <Link href={categoryHref(c.slug)} className="group flex flex-col items-center gap-2.5 text-center">
                <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg bg-iris-50 shadow-xs transition-[box-shadow,transform] duration-(--dur-med) group-hover:-translate-y-1 group-hover:shadow-md motion-reduce:transition-none">
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="(max-width: 720px) 33vw, 160px" className="object-cover" />
                  ) : (
                    <LayoutGrid aria-hidden className="size-10 text-iris-400" strokeWidth={1.5} />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.81rem] font-semibold text-fg group-hover:text-primary">{c.name}</span>
                  <span className="text-caption text-fg-muted tabular-nums">
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <SectionEmpty icon={LayoutGrid} title="Categories are coming soon" text="Our team is setting up the catalog." />
      )}
    </HomeSection>
  );
}

export function ShopByCategorySkeleton() {
  return (
    <div role="status" aria-label="Loading categories" className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-[clamp(32px,6vw,56px)]">
      <Skeleton className="mb-2 h-3.5 w-20 rounded-sm" />
      <Skeleton className="mb-6 h-8 w-56 rounded-md" />
      <div className={gridClass}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-3.5 w-2/3 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
