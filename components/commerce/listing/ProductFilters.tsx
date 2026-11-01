import { X } from "lucide-react";
import Link from "next/link";
import type { ListingFacets } from "@/lib/listing.server";
import { hrefWith } from "@/lib/list-params";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductListParams } from "@/lib/validations/storefront-lists";
import { PriceFilter, UrlSelect } from "./ListingFilters";
import { facetOptions } from "./ListingParts";

/**
 * Product-listing filters shared by the store page and the category page: option lists, the filter row
 * (Type · [Category] · Brand · Price · Clear filters) and the "Active filters" chips. Everything writes
 * to the URL; the server re-queries.
 */

type Current = Record<string, string | number | undefined>;

export const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "top-rated", label: "Top rated" },
  { value: "newest", label: "Newest" },
];
const SHOW_LABEL: Record<Exclude<ProductListParams["show"], "">, string> = {
  "in-stock": "In stock",
  "on-sale": "On sale",
  new: "New arrivals",
  "free-shipping": "Free shipping",
};
/** "Filter By" options; each page picks which quick filters it offers. */
export const showOptions = (keys: (keyof typeof SHOW_LABEL)[]) => [{ value: "", label: "Default" }, ...keys.map((k) => ({ value: k, label: SHOW_LABEL[k] }))];
const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

/** Any filter (not the search, not the sort) is set. */
export const hasFilters = (q: ProductListParams) => !!(q.show || q.type || q.category || q.brand || q.min !== undefined || q.max !== undefined);

/** The filter row under a listing toolbar. `withCategory` = the store page (a category page scopes by its path). */
export function ProductFilterRow({
  q,
  facets,
  pathname,
  current,
  withCategory = false,
  clearKeepsSearch = true,
}: {
  q: ProductListParams;
  facets: ListingFacets;
  pathname: string;
  current: Current;
  withCategory?: boolean;
  /** "Clear filters" resets sort + filters but keeps what was typed in the search box. */
  clearKeepsSearch?: boolean;
}) {
  const active = q.sort !== "default" || hasFilters(q);
  return (
    <div
      role="group"
      aria-label="Filter products"
      className={cn(
        "grid grid-cols-1 items-center gap-x-5 gap-y-3 min-[520px]:grid-cols-2",
        withCategory ? "xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(300px,1.3fr)_auto]" : "xl:grid-cols-[repeat(2,minmax(0,1fr))_minmax(300px,1.3fr)_auto]",
      )}
    >
      <UrlSelect label="Type" name="type" value={q.type} options={TYPE_OPTIONS} pathname={pathname} current={current} />
      {withCategory && <UrlSelect label="Category" name="category" value={q.category} options={facetOptions("All categories", facets.categories, q.category)} pathname={pathname} current={current} />}
      <UrlSelect label="Brand" name="brand" value={q.brand} options={facetOptions("All brands", facets.brands, q.brand)} pathname={pathname} current={current} />
      <PriceFilter key={`${q.min}-${q.max}`} min={q.min} max={q.max} ceiling={facets.maxPriceDollars} pathname={pathname} current={current} />
      {active && clearKeepsSearch ? (
        <Link
          href={hrefWith(pathname, current, { sort: "", show: "", type: "", category: "", brand: "", min: "", max: "" })}
          scroll={false}
          className="inline-flex min-h-11 items-center gap-1.5 justify-self-start text-sm font-semibold whitespace-nowrap !text-primary hover:underline"
        >
          <X aria-hidden className="size-4" strokeWidth={2.2} />
          Clear filters
        </Link>
      ) : (
        <span aria-hidden className="hidden xl:block" />
      )}
    </div>
  );
}

/**
 * "Active filters:" chips (Category Page design) — one per applied search / filter, each removable on its
 * own, plus "Clear all" (back to the bare listing). Nothing applied → nothing rendered.
 */
export function ActiveFilterChips({ q, facets, pathname, current }: { q: ProductListParams; facets: ListingFacets; pathname: string; current: Current }) {
  const nameOf = (list: { slug: string; name: string }[], slug: string) => list.find((x) => x.slug === slug)?.name ?? slug;
  const price =
    q.min !== undefined && q.max !== undefined
      ? `${money(q.min)} – ${money(q.max)}`
      : q.min !== undefined
        ? `From ${money(q.min)}`
        : q.max !== undefined
          ? `Up to ${money(q.max)}`
          : null;
  type Chip = { key: string; label: string; remove: Record<string, string> };
  const all: (Chip | null)[] = [
    q.q ? { key: "q", label: `“${q.q}”`, remove: { q: "" } } : null,
    q.show ? { key: "show", label: SHOW_LABEL[q.show], remove: { show: "" } } : null,
    q.type ? { key: "type", label: q.type === "digital" ? "Digital" : "Physical", remove: { type: "" } } : null,
    q.category ? { key: "category", label: nameOf(facets.categories, q.category), remove: { category: "" } } : null,
    q.brand ? { key: "brand", label: nameOf(facets.brands, q.brand), remove: { brand: "" } } : null,
    price ? { key: "price", label: price, remove: { min: "", max: "" } } : null,
  ];
  const chips = all.filter((c): c is Chip => c !== null);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      <span className="mr-0.5 text-[0.81rem] font-semibold text-fg-muted">Active filters:</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={hrefWith(pathname, current, c.remove)}
          scroll={false}
          aria-label={`Remove filter ${c.label}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-iris-200 bg-iris-50 py-1.5 pr-2 pl-3 text-[0.81rem] font-semibold !text-primary transition-colors duration-(--dur-fast) hover:border-primary lg:min-h-8"
        >
          <span className="max-w-60 truncate">{c.label}</span>
          <X aria-hidden className="size-3.5" strokeWidth={2.4} />
        </Link>
      ))}
      <Link href={pathname} scroll={false} className="inline-flex min-h-11 items-center px-1 text-[0.81rem] font-semibold !text-fg-muted underline underline-offset-2 hover:!text-primary lg:min-h-8">
        Clear all
      </Link>
    </div>
  );
}
