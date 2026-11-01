import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Skeleton } from "@/components/states/Skeleton";
import { hrefWith } from "@/lib/list-params";
import type { FacetOption, ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type Current = Record<string, string | number | undefined>;

/**
 * Category / brand select options: "All …" + each facet with its count (stores or products). A selected
 * slug that isn't listed (inactive, unknown) still shows, so the select always reflects the URL.
 */
export function facetOptions(all: string, facets: FacetOption[], selected: string) {
  const opts = [{ value: "", label: all }, ...facets.map((f) => ({ value: f.slug, label: `${f.name} (${f.count})` }))];
  return selected && !facets.some((f) => f.slug === selected) ? [...opts, { value: selected, label: selected }] : opts;
}

/** Centered page links (All Vendors design): ‹ 1 2 3 4 5 ›, a window of 5 around the current page. Hidden for one page. */
export function ListPagination({ page, pageCount, pathname, current }: { page: number; pageCount: number; pathname: string; current: Current }) {
  if (pageCount <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  const box = "grid size-10 place-items-center rounded-md text-sm font-bold tabular-nums transition-colors duration-(--dur-fast) max-lg:size-11";
  const arrow = (to: number, label: string, Icon: LucideIcon, enabled: boolean) =>
    enabled ? (
      <Link href={hrefWith(pathname, current, { page: to })} aria-label={label} className={cn(box, "bg-card !text-fg shadow-xs hover:!text-primary")}>
        <Icon aria-hidden className="size-4.5" strokeWidth={2} />
      </Link>
    ) : (
      <span aria-hidden className={cn(box, "bg-card text-fg-subtle shadow-xs")}>
        <Icon className="size-4.5" strokeWidth={2} />
      </span>
    );
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {arrow(page - 1, "Previous page", ChevronLeft, page > 1)}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefWith(pathname, current, { page: p })}
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={cn(box, p === page ? "bg-primary !text-on-primary shadow-primary" : "bg-card !text-fg shadow-xs hover:!text-primary")}
        >
          {p}
        </Link>
      ))}
      {arrow(page + 1, "Next page", ChevronRight, page < pageCount)}
    </nav>
  );
}

/** Empty result card (iris circle + title + text + an action), as in the designs. */
export function ListMessage({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-18 text-center shadow-sm">
      <span className="grid size-19 place-items-center rounded-full bg-iris-50">
        <Icon aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
      </span>
      <h3 className="font-display text-h4 font-bold text-fg-strong">{title}</h3>
      <p className="max-w-[380px] text-sm text-fg-muted">{text}</p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

/** Product grid of the listing pages (store, category): ~230px columns, two per row on phones. */
export const listingGridClass = "grid grid-cols-[repeat(auto-fill,minmax(min(230px,calc(50%_-_10px)),1fr))] gap-[clamp(12px,2vw,20px)]";

/** One page of product cards (every card shows its seller — ProductCard). */
export function ListingGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul role="list" className={listingGridClass}>
      {products.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

/** Loading state of a listing's results: the count line + a grid of card skeletons. */
export function ListingSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <Skeleton className="mb-5 h-4 w-48 rounded-sm" />
      <div className={listingGridClass}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3.5">
              <Skeleton className="h-3.5 w-4/5 rounded-sm" />
              <Skeleton className="mt-1.5 h-4.5 w-2/5 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
