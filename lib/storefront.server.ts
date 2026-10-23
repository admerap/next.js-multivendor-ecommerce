import "server-only";

import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { categoryHref, subCategoryHref, subSubCategoryHref } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { htmlToText } from "@/lib/rich-text";
import { sanitizeDescription } from "@/lib/rich-text.server";
import {
  productPricing,
  type BrandCardData,
  type CategoryCardData,
  type ProductCardData,
  type ProductPageData,
  type QuickViewProduct,
  type ReviewSummary,
  type SellerCardData,
  type StoreSummary,
} from "@/lib/storefront";

/**
 * Storefront data layer — every product query goes through VISIBLE (CLAUDE.md §6): the product is
 * APPROVED and switched on by its vendor, the vendor is APPROVED (a suspended store disappears) and its
 * category is ACTIVE. Each function returns only what its section renders; `cache` dedupes per request.
 */
export const VISIBLE: Prisma.ProductWhereInput = {
  approvalStatus: "APPROVED",
  isActive: true,
  vendor: { status: "APPROVED" },
  category: { status: "ACTIVE" },
};

const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  thumbnail: true,
  price: true,
  compareAtPrice: true,
  discountType: true,
  discountValue: true,
  productType: true,
  stock: true,
  vendor: { select: { id: true, storeName: true, slug: true } },
  _count: { select: { variations: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }>;

function toCard(p: CardRow): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.thumbnail,
    ...productPricing(p),
    seller: { id: p.vendor.id, name: p.vendor.storeName, slug: p.vendor.slug },
    rating: 0,
    reviewCount: 0,
    // Product.stock is already the total of its variations (kept in sync on save).
    inStock: p.productType === "DIGITAL" || p.stock > 0,
    stock: p.productType === "DIGITAL" ? null : p.stock,
    hasVariations: p._count.variations > 0,
  };
}

const NEWEST: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

async function cards(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take: number) {
  const rows = await prisma.product.findMany({ where: { ...VISIBLE, ...where }, orderBy, take, select: CARD_SELECT });
  return rows.map(toCard);
}

/** Has a reduction: a product discount, or a compare-at price (compared to `price` after loading). */
const DISCOUNTED: Prisma.ProductWhereInput = { OR: [{ discountValue: { gt: 0 } }, { compareAtPrice: { not: null } }] };

// ── Product sections ──────────────────────────────────────────────────────────

/**
 * Flash Deal: discounted products, biggest reduction first. There is no campaign schedule in the data
 * yet, so it runs as a daily deal that ends at midnight (server time).
 * TODO(flash-deals): admin-managed flash-deal campaigns with their own start/end and product list.
 */
export const getFlashDeals = cache(async (limit = 10): Promise<{ products: ProductCardData[]; endsAt: string }> => {
  const rows = (await cards(DISCOUNTED, NEWEST, 60)).filter((p) => p.compareAt !== null);
  const products = rows.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0)).slice(0, limit);
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  return { products, endsAt: end.toISOString() };
});

/** Featured Products: the admin's Featured check (Product Manage › Featured Product). */
export const getFeaturedProducts = cache((limit = 10) => cards({ isFeatured: true }, NEWEST, limit));

/** Featured Deals: featured AND discounted — the admin's picks that are also on sale. */
export const getFeaturedDeals = cache(async (limit = 10) => (await cards({ isFeatured: true, ...DISCOUNTED }, NEWEST, limit * 2)).filter((p) => p.compareAt !== null).slice(0, limit));

/** Latest Products: newest visible products. */
export const getLatestProducts = cache((limit = 10) => cards({}, NEWEST, limit));

/** New Arrivals: added in the last 30 days, newest first. */
export const getNewArrivals = cache((limit = 10) => {
  const since = new Date(Date.now() - 30 * 86_400_000);
  return cards({ createdAt: { gte: since } }, NEWEST, limit);
});

/**
 * Best Selling — proxy until orders exist: the admin's Popular picks first, then Featured, then newest.
 * TODO(orders): rank by units sold (OrderItem) once checkout records orders.
 */
export const getBestSelling = cache((limit = 10) => cards({}, [{ isPopular: "desc" }, { isFeatured: "desc" }, ...NEWEST], limit));

/**
 * Top Rated — proxy until reviews exist: Featured picks first, then Popular, then the longest-listed.
 * TODO(reviews): rank by average rating (min. review count) once the Review model exists.
 */
export const getTopRated = cache((limit = 10) => cards({}, [{ isFeatured: "desc" }, { isPopular: "desc" }, { createdAt: "asc" }, { id: "asc" }], limit));

/** Trending: what the admin checked as Popular (Product Manage › Popular Product). */
export const getTrending = cache((limit = 10) => cards({ isPopular: true }, NEWEST, limit));

/** A category rail on the home page (Fashion, Mobile…): the category + its newest products; null if it doesn't exist. */
export const getProductsByCategory = cache(async (categorySlug: string, limit = 10) => {
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, status: "ACTIVE" },
    select: { id: true, name: true, slug: true, image: true },
  });
  if (!category) return null;
  return { category: { name: category.name, slug: category.slug, image: category.image }, products: await cards({ categoryId: category.id }, NEWEST, limit) };
});

// ── Categories, brands, sellers ──────────────────────────────────────────────

/** Shop by Category: active categories with their image and how many visible products they hold. */
export const getCategoriesWithCount = cache(async (): Promise<CategoryCardData[]> => {
  const rows = await prisma.category.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { name: true, slug: true, image: true, _count: { select: { products: { where: VISIBLE } } } },
  });
  return rows.map((c) => ({ name: c.name, slug: c.slug, image: c.image, productCount: c._count.products }));
});

/** Shop by Brand: every active brand (with its visible product count). */
export const getBrands = cache(async (): Promise<BrandCardData[]> => {
  const rows = await prisma.brand.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { name: true, slug: true, image: true, _count: { select: { products: { where: VISIBLE } } } },
  });
  return rows.map((b) => ({ name: b.name, slug: b.slug, image: b.image, productCount: b._count.products }));
});

/**
 * Top Sellers — proxy until orders exist: approved stores ranked by how many visible products they sell.
 * TODO(orders): rank by revenue / units sold once checkout records orders.
 */
export const getTopSellers = cache(async (limit = 6): Promise<SellerCardData[]> => {
  // Rank by VISIBLE products per store. groupBy keys are unique, so a store can never appear twice
  // (ordering vendors by a filtered relation count joins rows and could repeat a store).
  // VISIBLE already requires vendor.status = APPROVED, so every grouped store is an approved one.
  const counts = await prisma.product.groupBy({
    by: ["vendorId"],
    where: VISIBLE,
    _count: { _all: true },
    orderBy: [{ _count: { vendorId: "desc" } }, { vendorId: "asc" }],
  });
  const top = counts.slice(0, limit * 3);
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: top.map((c) => c.vendorId) } },
    select: { id: true, storeName: true, slug: true, logo: true, coverImage: true },
  });
  const byId = new Map(vendors.map((v) => [v.id, v]));
  return top
    .flatMap((c) => {
      const v = byId.get(c.vendorId);
      return v ? [{ id: v.id, name: v.storeName, slug: v.slug, logo: v.logo, cover: v.coverImage, productCount: c._count._all, rating: 0 }] : [];
    })
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
    .slice(0, limit);
});

// ── Quick view + product page ────────────────────────────────────────────────

/** Storefront slugs are lowercase a–z, 0–9 and dashes; anything else can't exist → no query. */
const isSlug = (slug: string) => slug.length > 0 && slug.length <= 220 && /^[a-z0-9-]+$/.test(slug);

const LEVEL = { select: { id: true, name: true, slug: true, status: true } } as const;

const DETAIL_SELECT = {
  ...CARD_SELECT,
  sku: true,
  shortDescription: true,
  minOrderQty: true,
  variantOptions: true,
  images: { orderBy: { position: "asc" }, select: { url: true } },
  brand: { select: { name: true, status: true } },
  category: LEVEL,
  subCategory: LEVEL,
  subSubCategory: LEVEL,
  variations: { orderBy: { position: "asc" }, select: { id: true, name: true, attributes: true, price: true, stock: true, image: true } },
} satisfies Prisma.ProductSelect;

type DetailRow = Prisma.ProductGetPayload<{ select: typeof DETAIL_SELECT }>;

/** Quick-view shape of a visible product (shared by the modal and the product page). */
function toQuickView(p: DetailRow): QuickViewProduct {
  const card = toCard(p);
  const options = Array.isArray(p.variantOptions)
    ? (p.variantOptions as unknown[]).flatMap((o) => {
        const opt = o as { name?: unknown; values?: unknown };
        return typeof opt.name === "string" && Array.isArray(opt.values) ? [{ name: opt.name, values: opt.values.filter((v): v is string => typeof v === "string") }] : [];
      })
    : [];
  // Breadcrumb: an inactive sub level is hidden from the storefront, so it (and anything below it) is left out.
  const sub = p.subCategory?.status === "ACTIVE" ? p.subCategory : null;
  const subSub = sub && p.subSubCategory?.status === "ACTIVE" ? p.subSubCategory : null;
  const path = [
    { name: p.category.name, href: categoryHref(p.category.slug) },
    ...(sub ? [{ name: sub.name, href: subCategoryHref(p.category.slug, sub.slug) }] : []),
    ...(sub && subSub ? [{ name: subSub.name, href: subSubCategoryHref(p.category.slug, sub.slug, subSub.slug) }] : []),
  ];

  return {
    ...card,
    // Thumbnail first, then the gallery; the same photo uploaded twice shows once.
    images: [...new Set([p.thumbnail, ...p.images.map((i) => i.url)].filter((x): x is string => !!x))],
    shortDescription: p.shortDescription,
    categoryPath: path,
    brand: p.brand?.status === "ACTIVE" ? p.brand.name : null,
    sku: p.sku,
    digital: p.productType === "DIGITAL",
    stock: p.stock,
    minOrderQty: p.minOrderQty,
    options,
    variations: p.variations.map((v) => {
      // The product's discount applies to every variation's own price.
      const priced = productPricing({ ...p, price: v.price });
      return { id: v.id, name: v.name, attributes: (v.attributes ?? {}) as Record<string, string>, price: priced.price, compareAt: priced.compareAt, stock: v.stock, image: v.image };
    }),
  };
}

/** Everything the quick-view modal shows, for a visible product only (null otherwise). */
export const getQuickViewProduct = cache(async (slug: string): Promise<QuickViewProduct | null> => {
  if (!isSlug(slug)) return null;
  const p = await prisma.product.findFirst({ where: { ...VISIBLE, slug }, select: DETAIL_SELECT });
  return p ? toQuickView(p) : null;
});

const PAGE_SELECT = {
  ...DETAIL_SELECT,
  description: true,
  unit: true,
  videoUrl: true,
  tags: true,
  metaTitle: true,
  metaDescription: true,
  categoryId: true,
  subCategoryId: true,
  subSubCategoryId: true,
} satisfies Prisma.ProductSelect;

/**
 * The product details page (/product/[slug]). VISIBLE only: a pending, denied, hidden, suspended-store
 * or inactive-category product returns null → the page 404s, even by direct link. One query.
 * `cache` lets generateMetadata and the page share it.
 */
export const getProductBySlug = cache(async (slug: string): Promise<ProductPageData | null> => {
  if (!isSlug(slug)) return null;
  const p = await prisma.product.findFirst({ where: { ...VISIBLE, slug }, select: PAGE_SELECT });
  if (!p) return null;

  // Sanitized again on the way out (defense in depth; it was sanitized on save too).
  const descriptionHtml = sanitizeDescription(p.description);
  const text = htmlToText(descriptionHtml);
  return {
    ...toQuickView(p),
    descriptionHtml,
    unit: p.unit,
    videoUrl: p.videoUrl,
    tags: Array.isArray(p.tags) ? (p.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
    meta: {
      title: p.metaTitle?.trim() || p.name,
      description: p.metaDescription?.trim() || p.shortDescription?.trim() || (text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text),
      image: p.thumbnail,
    },
    catalog: { categoryId: p.categoryId, subCategoryId: p.subCategoryId, subSubCategoryId: p.subSubCategoryId },
  };
});

/** Seller card: the product's store (APPROVED only) and how many products it shows on the storefront. */
export const getVendorForProduct = cache(async (vendorId: string): Promise<StoreSummary | null> => {
  const v = await prisma.vendor.findFirst({
    where: { id: vendorId, status: "APPROVED" },
    select: { id: true, storeName: true, slug: true, logo: true, _count: { select: { products: { where: VISIBLE } } } },
  });
  return v ? { id: v.id, name: v.storeName, slug: v.slug, logo: v.logo, productCount: v._count.products, rating: 0, reviewCount: 0 } : null;
});

/** "More From The Store": the same store's other visible products, newest first. */
export const getMoreFromVendor = cache((vendorId: string, excludeProductId: string, limit = 5) =>
  cards({ vendorId, id: { not: excludeProductId } }, NEWEST, limit),
);

/**
 * "Similar Products": visible products from the same sub-sub-category first, then the sub-category, then
 * the category, until `limit` is reached (never the product itself, never twice). Within a level the
 * admin's Popular / Featured picks come first, then newest. At most 3 queries, usually 1.
 */
export const getSimilarProducts = cache(async (catalog: ProductPageData["catalog"], excludeProductId: string, limit = 10) => {
  const levels: Prisma.ProductWhereInput[] = [
    ...(catalog.subSubCategoryId ? [{ subSubCategoryId: catalog.subSubCategoryId }] : []),
    ...(catalog.subCategoryId ? [{ subCategoryId: catalog.subCategoryId }] : []),
    { categoryId: catalog.categoryId },
  ];
  const found: ProductCardData[] = [];
  for (const level of levels) {
    if (found.length >= limit) break;
    const exclude = [excludeProductId, ...found.map((p) => p.id)];
    found.push(...(await cards({ ...level, id: { notIn: exclude } }, [{ isPopular: "desc" }, { isFeatured: "desc" }, ...NEWEST], limit - found.length)));
  }
  return found;
});

/**
 * Reviews tab. There is no Review model yet, so every product has none: the page renders its
 * "No reviews yet" state from this empty summary.
 * TODO(reviews): load approved reviews for `productId` (average, per-star counts, newest first) once the
 * Review model exists — the page already renders ReviewSummary, so only this function changes.
 */
export const getProductReviews = cache(async (productId: string): Promise<ReviewSummary> => {
  void productId;
  return { average: 0, count: 0, distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })), reviews: [] };
});
