import { Bot, PackageSearch, RotateCcw, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchBox, UrlSelect } from "@/components/commerce/listing/ListingFilters";
import { ListingGrid, ListingSkeleton, ListMessage, ListPagination } from "@/components/commerce/listing/ListingParts";
import { hasFilters, ProductFilterRow, showOptions, SORT_OPTIONS } from "@/components/commerce/listing/ProductFilters";
import { StoreCover, StoreLogo } from "@/components/commerce/StoreCard";
import { Breadcrumb, HelpCards, pageContainer } from "@/components/commerce/StorefrontBits";
import { Button } from "@/components/ui/button";
import { firstParams } from "@/lib/list-params";
import { sellerHref, type StoreProfile } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { productListSchema, productListUrlParams, type ProductListParams } from "@/lib/validations/storefront-lists";
import { getStoreFacets, getVendorProducts, getVendorStore } from "@/lib/vendors.server";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STORE_SHOW = showOptions(["in-stock", "on-sale", "new"]);

const joined = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getVendorStore(slug);
  if (!store) notFound();
  return {
    title: store.name,
    description: `Shop ${store.productCount} ${store.productCount === 1 ? "product" : "products"} from ${store.name}, a verified seller on Sundry.`,
    alternates: { canonical: sellerHref(store.slug) },
    openGraph: { title: store.name, images: store.cover ? [store.cover] : store.logo ? [store.logo] : undefined },
  };
}

/**
 * A store page (Vendor Details Page design): cover banner + store card (logo, name, rating, reviews,
 * orders, joined, Ask AI Support) and the "All Product" toolbar: search, sort, filter by, plus a filter row
 * scoped to THIS store's types / categories / brands / prices. APPROVED stores only (else 404); VISIBLE products only.
 */
export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const store = await getVendorStore(slug);
  if (!store) notFound();
  const q = productListSchema.parse(firstParams(await searchParams));
  const facets = await getStoreFacets(store.id);
  const path = sellerHref(store.slug);
  const current = productListUrlParams(q);

  return (
    <main className="pb-4">
      <Breadcrumb
        trail={[
          { name: "Home", href: "/" },
          { name: "All Vendors", href: "/vendors" },
        ]}
        current={store.name}
      />
      <div className={cn(pageContainer, "pt-4")}>
        <StoreCover cover={store.cover} priority sizes="(max-width: 1440px) 100vw, 1360px" className="h-[clamp(160px,22vw,280px)] rounded-xl shadow-sm" />
        <StoreHeader store={store} />

        {/* "All Product" toolbar: search, sort, quick filter — and a second row with the store-scoped filters
            (type, category, brand, price) instead of the design's sidebar, so products get the full width. */}
        <div className="mt-5 rounded-lg bg-card px-5 py-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="border-b-3 border-primary pb-1.5 text-[0.94rem] font-extrabold text-fg-strong">All Product</span>
            <SearchBox variant="field" pathname={path} value={q.q} placeholder="Search for items…" label={`Search ${store.name}`} buttonLabel="Search this store" current={current} />
            <div className="grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-3 min-[520px]:grid-cols-2 lg:flex lg:w-auto lg:flex-none">
              <UrlSelect label="Sort by" name="sort" value={q.sort} options={SORT_OPTIONS} pathname={path} current={current} className="lg:w-60" />
              <UrlSelect label="Filter By" name="show" value={q.show} options={STORE_SHOW} pathname={path} current={current} className="lg:w-52" />
            </div>
          </div>
          <div className="mt-3.5 border-t border-line pt-3.5">
            <ProductFilterRow q={q} facets={facets} pathname={path} current={current} withCategory />
          </div>
        </div>
      </div>

      <div className={cn(pageContainer, "pt-6")}>
        <section aria-label={`Products from ${store.name}`} className="min-w-0">
          <Suspense key={JSON.stringify(q)} fallback={<ListingSkeleton label="Loading products" />}>
            <StoreProducts store={store} params={q} path={path} />
          </Suspense>
        </section>
      </div>
      <HelpCards className="pt-14" />
    </main>
  );
}

/** Store identity card overlapping the cover (Vendor Details Page design). */
function StoreHeader({ store }: { store: StoreProfile }) {
  const sep = <span aria-hidden className="h-3 w-px bg-line-default" />;
  return (
    <div className="relative z-10 mx-[clamp(12px,3vw,32px)] -mt-13 flex max-w-140 flex-wrap items-center gap-4 rounded-lg bg-card px-5 py-4.5 shadow-md">
      <StoreLogo logo={store.logo} name={store.name} sizes="64px" className="size-16 text-[1.6rem] ring-4 ring-card" />
      <div className="min-w-0 flex-1">
        <h1 className="mb-1.5 truncate font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong" title={store.name}>
          {store.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.81rem] text-fg-muted">
          <span className="flex items-center gap-1" aria-label={`Rating ${store.rating.toFixed(1)} out of 5`}>
            <b className="text-fg-strong tabular-nums">{store.rating.toFixed(1)}</b>
            <Star aria-hidden className="size-3.5 fill-current text-rating" strokeWidth={1.5} />
          </span>
          {sep}
          <span>
            <b className="text-fg-strong tabular-nums">{store.reviewCount}</b> {store.reviewCount === 1 ? "Review" : "Reviews"}
          </span>
          {sep}
          <span>
            <b className="text-fg-strong tabular-nums">{store.orderCount}</b> {store.orderCount === 1 ? "Order" : "Orders"}
          </span>
        </p>
        <p className="mt-1 text-caption text-fg-subtle">
          Joined <time dateTime={store.joinedAt}>{joined.format(new Date(store.joinedAt))}</time>
        </p>
      </div>
      {/* Sundry AI Support replaces chat with the vendor (CLAUDE.md §3). */}
      <Button asChild className="max-sm:w-full">
        <Link href="/account/inbox">
          <Bot aria-hidden />
          Ask AI Support
        </Link>
      </Button>
    </div>
  );
}

async function StoreProducts({ store, params, path }: { store: StoreProfile; params: ProductListParams; path: string }) {
  const result = await getVendorProducts(store.id, params);
  const filtered = !!params.q || hasFilters(params);

  if (result.total === 0) {
    return filtered ? (
      <ListMessage icon={PackageSearch} title="No products match your filters" text={`${store.name} hasn't listed products matching your filters. Try clearing a filter.`}>
        <Button asChild>
          <Link href={path}>
            <RotateCcw aria-hidden />
            Clear all filters
          </Link>
        </Button>
      </ListMessage>
    ) : (
      <ListMessage icon={PackageSearch} title="No products in this store yet" text={`${store.name} hasn't listed any products yet. Check back soon.`} />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-fg-muted" aria-live="polite">
        <b className="text-fg-strong tabular-nums">{result.total}</b> {result.total === 1 ? "product" : "products"} from <b className="text-fg-strong">{store.name}</b>
      </p>
      <ListingGrid products={result.items} />
      <ListPagination page={result.page} pageCount={result.pageCount} pathname={path} current={productListUrlParams(params)} />
    </>
  );
}
