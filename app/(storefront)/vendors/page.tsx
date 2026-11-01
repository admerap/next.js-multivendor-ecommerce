import { RotateCcw, Store, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox, UrlSelect } from "@/components/commerce/listing/ListingFilters";
import { facetOptions, ListMessage, ListPagination } from "@/components/commerce/listing/ListingParts";
import { StoreCard, StoreCardSkeleton, storeGridClass } from "@/components/commerce/StoreCard";
import { Breadcrumb, HelpCards, pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { Button } from "@/components/ui/button";
import { firstParams, hrefWith } from "@/lib/list-params";
import { cn } from "@/lib/utils";
import { vendorListSchema, type VendorListParams } from "@/lib/validations/storefront-lists";
import { getApprovedVendors, getVendorListFacets } from "@/lib/vendors.server";

export const metadata: Metadata = {
  title: "All Vendors",
  description: "Find your desired stores and shop your favourite products from verified independent sellers on Sundry.",
};

const PATH = "/vendors";
const SORTS = [
  { value: "default", label: "Default" },
  { value: "top-rated", label: "Top rated" },
  { value: "most-products", label: "Most products" },
  { value: "newest", label: "Newest stores" },
];
const TYPES = [
  { value: "", label: "All" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * All Vendors (All Vendor Page design): hero with the verified-seller count + store search, a filter bar
 * (sort, product type, category, brand — a row of selects instead of the design's sidebar, so the grid
 * gets the full width) and the store grid. Approved stores only; every
 * filter lives in the URL, so results are shareable and survive a refresh.
 */
export default async function VendorsPage({ searchParams }: Props) {
  const params = vendorListSchema.parse(firstParams(await searchParams));
  const facets = await getVendorListFacets();
  const current = { ...params };
  const activeCount = [params.sort !== "default", params.type, params.category, params.brand].filter(Boolean).length;

  return (
    <main className="pb-4">
      <Breadcrumb trail={[{ name: "Home", href: "/" }]} current="All Vendors" />
      <div className={cn(pageContainer, "pt-4")}>
        <div className="relative flex flex-wrap items-center gap-6 overflow-hidden rounded-xl bg-linear-120 from-iris-50 to-card px-[clamp(20px,4vw,32px)] py-9 shadow-sm">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_20%,var(--iris-100),transparent_55%)] opacity-50" />
          <div className="relative min-w-0 flex-[1_1_320px]">
            <h1 className="font-display text-[clamp(1.6rem,4vw,2rem)] font-extrabold tracking-[-0.02em] text-fg-strong">All Stores</h1>
            <p className="mt-2 text-[0.94rem] text-fg-muted">
              Find your desired stores and shop your favourite products — <b className="text-fg-strong tabular-nums">{facets.storeCount}</b> verified{" "}
              {facets.storeCount === 1 ? "seller" : "sellers"}.
            </p>
          </div>
          <SearchBox variant="pill" pathname={PATH} value={params.q} placeholder="Search store…" label="Search stores" buttonLabel="Search" current={current} />
        </div>
      </div>

      {/* Filter bar: one row of selects above the grid (the store grid gets the full width). */}
      <div className={cn(pageContainer, "pt-5")}>
        <div role="group" aria-label="Filter stores" className="grid grid-cols-1 items-center gap-x-5 gap-y-3 rounded-lg bg-card px-5 py-3.5 shadow-sm min-[520px]:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <UrlSelect label="Sort by" name="sort" value={params.sort} options={SORTS} pathname={PATH} current={current} />
          <UrlSelect label="Type" name="type" value={params.type} options={TYPES} pathname={PATH} current={current} />
          <UrlSelect label="Category" name="category" value={params.category} options={facetOptions("All categories", facets.categories, params.category)} pathname={PATH} current={current} />
          <UrlSelect label="Brand" name="brand" value={params.brand} options={facetOptions("All brands", facets.brands, params.brand)} pathname={PATH} current={current} />
          {activeCount > 0 ? (
            <Link href={hrefWith(PATH, current, { sort: "", type: "", category: "", brand: "" })} className="inline-flex min-h-11 items-center gap-1.5 justify-self-start text-sm font-semibold whitespace-nowrap !text-primary hover:underline">
              <X aria-hidden className="size-4" strokeWidth={2.2} />
              Clear filters
            </Link>
          ) : (
            <span aria-hidden className="hidden lg:block" />
          )}
        </div>
      </div>

      <div className={cn(pageContainer, "pt-6")}>
        <section aria-label="Stores" className="min-w-0">
          {/* Keyed by the filters: changing one shows the skeleton while the new page loads. */}
          <Suspense key={JSON.stringify(params)} fallback={<StoreResultsSkeleton />}>
            <StoreResults params={params} />
          </Suspense>
        </section>
      </div>
      <HelpCards className="pt-14" />
    </main>
  );
}

async function StoreResults({ params }: { params: VendorListParams }) {
  const result = await getApprovedVendors(params);
  const filtered = !!(params.q || params.type || params.category || params.brand);

  if (result.total === 0) {
    return filtered ? (
      <ListMessage icon={Store} title="No stores match your filters" text="Try a different category or clear a filter to see more sellers on Sundry.">
        <Button asChild>
          <Link href={PATH}>
            <RotateCcw aria-hidden />
            Clear all filters
          </Link>
        </Button>
      </ListMessage>
    ) : (
      <ListMessage icon={Store} title="No sellers yet" text="Independent stores will appear here as soon as they're approved to sell on Sundry." />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-fg-muted" aria-live="polite">
        <b className="text-fg-strong tabular-nums">{result.total}</b> {result.total === 1 ? "store" : "stores"} found
      </p>
      <ul role="list" className={storeGridClass}>
        {result.items.map((s) => (
          <li key={s.id} className="min-w-0">
            <StoreCard store={s} />
          </li>
        ))}
      </ul>
      <ListPagination page={result.page} pageCount={result.pageCount} pathname={PATH} current={{ ...params }} />
    </>
  );
}

function StoreResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading stores">
      <Skeleton className="mb-5 h-4 w-32 rounded-sm" />
      <div className={storeGridClass}>
        {Array.from({ length: 6 }, (_, i) => (
          <StoreCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
