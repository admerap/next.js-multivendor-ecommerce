import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { productPricing, type FacetOption, type Paged, type ProductCardData } from "@/lib/storefront";
import { CARD_SELECT, toCard, VISIBLE } from "@/lib/storefront.server";
import type { ProductListParams } from "@/lib/validations/storefront-lists";

/**
 * The storefront's one product-listing engine: a SCOPE (a store, a category node…) + the URL filters →
 * one page of VISIBLE product cards, and the sidebar facets of that scope. Store pages and category pages
 * both use it, so filters, sorts and pagination behave the same everywhere.
 */

export const PRODUCTS_PAGE_SIZE = 20;
export const NEW_ARRIVAL_DAYS = 30;

export function paginate<T>(all: T[], page: number, pageSize: number): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(page, pageCount); // ?page=99 past the end → last page
  return { items: all.slice((current - 1) * pageSize, current * pageSize), total: all.length, page: current, pageCount, pageSize };
}

/** Type / category / brand slugs → product filters. Inactive categories and brands match nothing. */
export function productFilters(p: { type: string; category: string; brand: string }): Prisma.ProductWhereInput {
  return {
    ...(p.type ? { productType: p.type === "digital" ? "DIGITAL" : "PHYSICAL" } : {}),
    // VISIBLE already says category.status ACTIVE; restated because this replaces its `category` key.
    ...(p.category ? { category: { slug: p.category, status: "ACTIVE" } } : {}),
    ...(p.brand ? { brand: { slug: p.brand, status: "ACTIVE" } } : {}),
  };
}

/** "Filter By" quick filters. */
function showFilter(show: ProductListParams["show"]): Prisma.ProductWhereInput {
  switch (show) {
    case "in-stock":
      return { OR: [{ productType: "DIGITAL" }, { stock: { gt: 0 } }] };
    case "on-sale":
      // A product discount, or a compare-at price ABOVE the price (a lower one isn't a sale).
      return { OR: [{ discountValue: { gt: 0 } }, { compareAtPrice: { gt: prisma.product.fields.price } }] };
    case "new":
      return { createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_DAYS * 86_400_000) } };
    case "free-shipping":
      // The vendor charges no shipping for it; digital products never ship.
      return { OR: [{ productType: "DIGITAL" }, { shippingCost: 0 }] };
    default:
      return {};
  }
}

const ORDER: Record<ProductListParams["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  // The admin's merchandising picks first, then newest.
  default: [{ isFeatured: "desc" }, { isPopular: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  // TODO(reviews): average rating once reviews exist — same proxy as the home's Top Rated.
  "top-rated": [{ isFeatured: "desc" }, { isPopular: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  // Price sorts run on the final (discounted) price after loading — see below.
  "price-asc": [{ createdAt: "desc" }, { id: "desc" }],
  "price-desc": [{ createdAt: "desc" }, { id: "desc" }],
};

/**
 * One page of a scope's VISIBLE products, as product cards. Search (name), type, category, brand and
 * "Filter By" run in SQL. The price range and price sorts use the FINAL price (after the product's
 * discount), which isn't a column, so they run on the scope's matching products in memory — one query
 * per page view. (Fine for a store or a category; a store-wide search would page in SQL instead.)
 */
export async function listProducts(scope: Prisma.ProductWhereInput, params: ProductListParams, pageSize = PRODUCTS_PAGE_SIZE): Promise<Paged<ProductCardData>> {
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, ...scope, ...productFilters(params), ...(params.q ? { name: { contains: params.q } } : {}), ...showFilter(params.show) },
    orderBy: ORDER[params.sort],
    select: CARD_SELECT,
  });

  let items = rows.map(toCard);
  if (params.min !== undefined) items = items.filter((p) => p.price >= params.min!);
  if (params.max !== undefined) items = items.filter((p) => p.price <= params.max!);
  // Array.sort is stable: equal prices keep the newest-first order from SQL.
  if (params.sort === "price-asc") items.sort((a, b) => a.price - b.price);
  if (params.sort === "price-desc") items.sort((a, b) => b.price - a.price);
  return paginate(items, params.page, pageSize);
}

export type ListingFacets = { categories: FacetOption[]; brands: FacetOption[]; maxPriceDollars: number };

/**
 * Filter options that actually exist in a scope: its categories and brands (count = visible products in
 * each) and its highest final price in whole dollars. 3 queries + 2 lookups.
 */
export async function listingFacets(scope: Prisma.ProductWhereInput): Promise<ListingFacets> {
  const where: Prisma.ProductWhereInput = { ...VISIBLE, ...scope };
  const [byCategory, byBrand, prices] = await Promise.all([
    prisma.product.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.product.groupBy({ by: ["brandId"], where: { ...where, brandId: { not: null } }, _count: { _all: true } }),
    prisma.product.findMany({ where, select: { price: true, compareAtPrice: true, discountType: true, discountValue: true } }),
  ]);
  const maxCents = prices.reduce((m, p) => Math.max(m, productPricing(p).price), 0);
  const catCount = new Map(byCategory.map((c) => [c.categoryId, c._count._all]));
  const brandCount = new Map(byBrand.flatMap((b) => (b.brandId ? [[b.brandId, b._count._all] as const] : [])));
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { id: { in: [...catCount.keys()] }, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, image: true } }),
    prisma.brand.findMany({ where: { id: { in: [...brandCount.keys()] }, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, image: true } }),
  ]);
  return {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, image: c.image, count: catCount.get(c.id) ?? 0 })),
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, image: b.image, count: brandCount.get(b.id) ?? 0 })),
    maxPriceDollars: Math.ceil(maxCents / 100),
  };
}
