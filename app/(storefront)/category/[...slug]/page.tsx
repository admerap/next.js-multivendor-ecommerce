import { LayoutGrid, PackageSearch, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchBox, UrlSelect } from "@/components/commerce/listing/ListingFilters";
import { ListingGrid, ListingSkeleton, ListMessage, ListPagination } from "@/components/commerce/listing/ListingParts";
import { ActiveFilterChips, hasFilters, ProductFilterRow, showOptions, SORT_OPTIONS } from "@/components/commerce/listing/ProductFilters";
import { Breadcrumb, HelpCards, pageContainer } from "@/components/commerce/StorefrontBits";
import { Button } from "@/components/ui/button";
import type { CategoryListingNode } from "@/lib/catalog";
import { getCategoryFacets, getCategoryProducts, resolveCategoryPath } from "@/lib/categories.server";
import { firstParams } from "@/lib/list-params";
import { cn } from "@/lib/utils";
import { productListSchema, productListUrlParams, type ProductListParams } from "@/lib/validations/storefront-lists";

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const CATEGORY_SHOW = showOptions(["in-stock", "on-sale", "free-shipping"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const node = await resolveCategoryPath(slug);
  if (!node) notFound();
  const trail = node.path.map((p) => p.name).join(" › ");
  return {
    title: node.path.length > 1 ? `${node.name} · ${node.path[0]!.name}` : node.name,
    description: `Shop ${trail} from independent sellers on Sundry — one cart, one checkout.`,
    alternates: { canonical: node.href },
  };
}

/**
 * Category listing (Category Page design) — ONE page for all three levels (/category/a, /a/b, /a/b/c).
 * The slug path resolves to a node (else 404: unknown, inactive or wrongly nested); it lists every
 * VISIBLE product at or below it. Breadcrumb = the real catalog path; chips drill one level down; search,
 * sort and filters live in the URL (shareable, refresh- and back-button-safe) and are read on the server.
 */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const node = await resolveCategoryPath(slug);
  if (!node) notFound();
  const q = productListSchema.parse(firstParams(await searchParams));
  const facets = await getCategoryFacets(node);
  // Every visible product under this node sits in exactly one top category → its count is the total.
  const total = facets.categories.reduce((n, c) => n + c.count, 0);
  const current = productListUrlParams(q);

  return (
    <main className="pb-4">
      <Breadcrumb trail={[{ name: "Home", href: "/" }, ...node.path.slice(0, -1)]} current={node.name} />
      <div className={cn(pageContainer, "pt-4")}>
        {/* Header card (Category Page design): title + count, search in this category, sort, quick filter —
            then the filter row (type, brand, price) instead of the design's sidebar. */}
        <header className="rounded-lg bg-card px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
            <div className="flex min-w-0 flex-[1_1_260px] items-center gap-4">
              <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
                {node.image ? <Image src={node.image} alt="" fill sizes="56px" className="object-cover" /> : <LayoutGrid aria-hidden className="size-6 text-primary" strokeWidth={1.8} />}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(1.35rem,3vw,1.55rem)] font-extrabold tracking-[-0.02em] text-fg-strong">{node.name} Products</h1>
                <p className="mt-1 text-sm text-fg-muted">
                  <b className="text-fg-strong tabular-nums">{total}</b> {total === 1 ? "item" : "items"} in {node.path.map((p) => p.name).join(" › ")}
                </p>
              </div>
            </div>
            <SearchBox variant="field" pathname={node.href} value={q.q} placeholder={`Search in ${node.name}…`} label={`Search in ${node.name}`} buttonLabel={`Search in ${node.name}`} current={current} className="h-11.5 flex-[1_1_260px]" />
            <div className="grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-3 min-[520px]:grid-cols-2 lg:flex lg:w-auto lg:flex-none">
              <UrlSelect label="Sort by" name="sort" value={q.sort} options={SORT_OPTIONS} pathname={node.href} current={current} className="lg:w-60" />
              <UrlSelect label="Filter By" name="show" value={q.show} options={CATEGORY_SHOW} pathname={node.href} current={current} className="lg:w-52" />
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <ProductFilterRow q={q} facets={facets} pathname={node.href} current={current} />
          </div>
        </header>

        {node.children.length > 0 && <SubCategoryNav node={node} />}
        <div className="mt-4 empty:hidden">
          <ActiveFilterChips q={q} facets={facets} pathname={node.href} current={current} />
        </div>
      </div>

      <div className={cn(pageContainer, "pt-6")}>
        <section aria-label={`Products in ${node.name}`} className="min-w-0">
          <Suspense key={JSON.stringify(q)} fallback={<ListingSkeleton label="Loading products" />}>
            <CategoryProducts node={node} params={q} />
          </Suspense>
        </section>
      </div>
      <HelpCards className="pt-14" />
    </main>
  );
}

/** One level down: "T-shirt (4) · Watches (1) …" — every active child, even an empty one (its page says so). */
function SubCategoryNav({ node }: { node: CategoryListingNode }) {
  return (
    <nav aria-label={`Browse ${node.name}`} className="mt-4">
      <ul role="list" className="flex flex-wrap gap-2">
        {node.children.map((c) => (
          <li key={c.slug}>
            <Link
              href={c.href}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-semibold !text-fg shadow-xs transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary lg:min-h-10"
            >
              {c.name}
              <span className="text-caption font-medium text-fg-muted tabular-nums">({c.count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function CategoryProducts({ node, params }: { node: CategoryListingNode; params: ProductListParams }) {
  const result = await getCategoryProducts(node, params);
  const filtered = !!params.q || hasFilters(params);

  if (result.total === 0) {
    return filtered ? (
      <ListMessage icon={PackageSearch} title="No products match your filters" text="Try widening your price range or clearing a brand filter to see more from our sellers.">
        <Button asChild>
          <Link href={node.href}>
            <RotateCcw aria-hidden />
            Clear all filters
          </Link>
        </Button>
      </ListMessage>
    ) : (
      <ListMessage icon={PackageSearch} title="No products in this category yet" text={`Sellers haven't listed anything in ${node.name} yet. Check back soon or browse another category.`}>
        <Button asChild>
          <Link href="/">
            <RotateCcw aria-hidden />
            Continue shopping
          </Link>
        </Button>
      </ListMessage>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-fg-muted" aria-live="polite">
        <b className="text-fg-strong tabular-nums">{result.total}</b> {result.total === 1 ? "item" : "items"} found
      </p>
      <ListingGrid products={result.items} />
      <ListPagination page={result.page} pageCount={result.pageCount} pathname={node.href} current={productListUrlParams(params)} />
    </>
  );
}
