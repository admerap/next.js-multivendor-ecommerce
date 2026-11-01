import "server-only";

import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { listingFacets, listProducts, paginate, productFilters, type ListingFacets } from "@/lib/listing.server";
import type { FacetOption, Paged, ProductCardData, StoreCardData, StoreProfile } from "@/lib/storefront";
import { isSlug, VISIBLE } from "@/lib/storefront.server";
import type { ProductListParams, VendorListParams } from "@/lib/validations/storefront-lists";

/**
 * Storefront stores: All Vendors (/vendors) and a store page (/vendors/[slug]).
 * Shoppers only ever see APPROVED stores (pending / suspended ones don't exist for them), and only
 * VISIBLE products (lib/storefront.server) — in lists, counts and filters alike.
 */

export const VENDORS_PAGE_SIZE = 12;

const APPROVED: Prisma.VendorWhereInput = { status: "APPROVED" };

// ── All Vendors ──────────────────────────────────────────────────────────────

/**
 * One page of approved stores. Search matches the store name; type / category / brand keep stores that
 * sell at least one visible product of it. Sorts: Default (A–Z) · Most products · Newest stores ·
 * Top rated (proxy = most products until reviews exist — TODO(reviews): rank by store rating).
 * 3 queries whatever the page size: matching ids → visible-product counts → the page's details.
 */
export const getApprovedVendors = cache(async (params: VendorListParams): Promise<Paged<StoreCardData>> => {
  const filters = productFilters(params);
  const where: Prisma.VendorWhereInput = {
    ...APPROVED,
    ...(params.q ? { storeName: { contains: params.q } } : {}),
    ...(Object.keys(filters).length ? { products: { some: { ...VISIBLE, ...filters } } } : {}),
  };
  const rows = await prisma.vendor.findMany({ where, select: { id: true, storeName: true, createdAt: true } });
  const counts = rows.length
    ? await prisma.product.groupBy({ by: ["vendorId"], where: { ...VISIBLE, vendorId: { in: rows.map((r) => r.id) } }, _count: { _all: true } })
    : [];
  const countOf = new Map(counts.map((c) => [c.vendorId, c._count._all]));

  const byName = (a: (typeof rows)[number], b: (typeof rows)[number]) => a.storeName.localeCompare(b.storeName) || a.id.localeCompare(b.id);
  const sorted = [...rows].sort((a, b) => {
    if (params.sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime() || byName(a, b);
    if (params.sort === "most-products" || params.sort === "top-rated") return (countOf.get(b.id) ?? 0) - (countOf.get(a.id) ?? 0) || byName(a, b);
    return byName(a, b);
  });

  const page = paginate(sorted, params.page, VENDORS_PAGE_SIZE);
  const details = await prisma.vendor.findMany({
    where: { id: { in: page.items.map((r) => r.id) } },
    select: { id: true, storeName: true, slug: true, logo: true, coverImage: true },
  });
  const byId = new Map(details.map((d) => [d.id, d]));
  return {
    ...page,
    items: page.items.flatMap((r) => {
      const d = byId.get(r.id);
      return d ? [{ id: d.id, name: d.storeName, slug: d.slug, logo: d.logo, cover: d.coverImage, productCount: countOf.get(d.id) ?? 0, rating: 0, reviewCount: 0 }] : [];
    }),
  };
});

/**
 * Sidebar of All Vendors: how many approved stores there are, and the categories / brands that approved
 * stores sell (count = number of stores selling it). 2 groupBy + 2 lookups.
 */
export const getVendorListFacets = cache(async (): Promise<{ storeCount: number; categories: FacetOption[]; brands: FacetOption[] }> => {
  const [storeCount, byCategory, byBrand] = await Promise.all([
    prisma.vendor.count({ where: APPROVED }),
    prisma.product.groupBy({ by: ["categoryId", "vendorId"], where: VISIBLE }),
    prisma.product.groupBy({ by: ["brandId", "vendorId"], where: { ...VISIBLE, brandId: { not: null }, brand: { status: "ACTIVE" } } }),
  ]);
  const storesPer = (pairs: { key: string | null }[]) => pairs.reduce((m, { key }) => (key ? m.set(key, (m.get(key) ?? 0) + 1) : m), new Map<string, number>());
  const catStores = storesPer(byCategory.map((r) => ({ key: r.categoryId })));
  const brandStores = storesPer(byBrand.map((r) => ({ key: r.brandId })));
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { id: { in: [...catStores.keys()] }, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, image: true } }),
    prisma.brand.findMany({ where: { id: { in: [...brandStores.keys()] }, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, image: true } }),
  ]);
  return {
    storeCount,
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, image: c.image, count: catStores.get(c.id) ?? 0 })),
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, image: b.image, count: brandStores.get(b.id) ?? 0 })),
  };
});

// ── A store page ─────────────────────────────────────────────────────────────

/** Public profile of an APPROVED store by slug; null (→ 404) for pending, suspended or unknown stores. */
export const getVendorStore = cache(async (slug: string): Promise<StoreProfile | null> => {
  if (!isSlug(slug)) return null;
  const v = await prisma.vendor.findFirst({
    where: { ...APPROVED, slug },
    select: { id: true, storeName: true, slug: true, logo: true, coverImage: true, createdAt: true, _count: { select: { products: { where: VISIBLE } } } },
  });
  if (!v) return null;
  return {
    id: v.id,
    name: v.storeName,
    slug: v.slug,
    logo: v.logo,
    cover: v.coverImage,
    productCount: v._count.products,
    rating: 0,
    reviewCount: 0,
    orderCount: 0,
    joinedAt: v.createdAt.toISOString(),
  };
});

/** The store page's filter options: this store's categories, brands and top price. */
export const getStoreFacets = cache((vendorId: string): Promise<ListingFacets> => listingFacets({ vendorId }));

/** One page of a store's VISIBLE products (shared listing engine — lib/listing.server). */
export const getVendorProducts = cache((vendorId: string, params: ProductListParams): Promise<Paged<ProductCardData>> => listProducts({ vendorId }, params));
