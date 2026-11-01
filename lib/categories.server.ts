import "server-only";

import { cache } from "react";
import { categoryHref, subCategoryHref, subSubCategoryHref, type CategoryListingNode } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { listingFacets, listProducts, type ListingFacets } from "@/lib/listing.server";
import type { Paged, ProductCardData } from "@/lib/storefront";
import { isSlug, VISIBLE } from "@/lib/storefront.server";
import type { ProductListParams } from "@/lib/validations/storefront-lists";

/**
 * Category listing (/category/[...slug]) — one page for all three levels:
 *   /category/fashion                        → everything in Fashion (and below)
 *   /category/fashion/t-shirt                → T-shirt and its sub-sub categories
 *   /category/fashion/t-shirt/man-t-shirt    → exactly Man T-shirt
 * A product stores all three of its levels (indexed), so "at or below a node" is one equality filter.
 */

const ACTIVE = { status: "ACTIVE" } as const;

/**
 * Slug path → the ACTIVE node it names, with its breadcrumb trail and its active children (+ visible
 * product counts). Null (→ 404) when the path is empty, too long, malformed, names an inactive level, or
 * isn't nested the way the catalog is (a real sub-category under the wrong category). 1 query for the
 * subtree + 1 groupBy for the counts.
 */
export function resolveCategoryPath(slugs: string[]): Promise<CategoryListingNode | null> {
  // Keyed by the joined path: cache() compares arguments by identity, and every call gets a new array.
  return resolvePath(slugs.join("/"));
}

const resolvePath = cache(async (joined: string): Promise<CategoryListingNode | null> => {
  const slugs = joined.split("/");
  if (slugs.length < 1 || slugs.length > 3 || !slugs.every(isSlug)) return null;
  const [catSlug, subSlug, subSubSlug] = slugs;

  const cat = await prisma.category.findFirst({
    where: { slug: catSlug, ...ACTIVE },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      subCategories: {
        where: ACTIVE,
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, subSubCategories: { where: ACTIVE, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } } },
      },
    },
  });
  if (!cat) return null;
  const sub = subSlug ? cat.subCategories.find((s) => s.slug === subSlug) : undefined;
  if (subSlug && !sub) return null;
  const subSub = sub && subSubSlug ? sub.subSubCategories.find((s) => s.slug === subSubSlug) : undefined;
  if (subSubSlug && !subSub) return null;

  const path = [
    { name: cat.name, href: categoryHref(cat.slug) },
    ...(sub ? [{ name: sub.name, href: subCategoryHref(cat.slug, sub.slug) }] : []),
    ...(sub && subSub ? [{ name: subSub.name, href: subSubCategoryHref(cat.slug, sub.slug, subSub.slug) }] : []),
  ];

  // Children one level down + how many visible products each holds.
  let children: CategoryListingNode["children"] = [];
  if (!sub) {
    const counts = await prisma.product.groupBy({ by: ["subCategoryId"], where: { ...VISIBLE, categoryId: cat.id }, _count: { _all: true } });
    const n = new Map(counts.map((c) => [c.subCategoryId, c._count._all]));
    children = cat.subCategories.map((s) => ({ name: s.name, slug: s.slug, href: subCategoryHref(cat.slug, s.slug), count: n.get(s.id) ?? 0 }));
  } else if (!subSub) {
    const counts = await prisma.product.groupBy({ by: ["subSubCategoryId"], where: { ...VISIBLE, subCategoryId: sub.id }, _count: { _all: true } });
    const n = new Map(counts.map((c) => [c.subSubCategoryId, c._count._all]));
    children = sub.subSubCategories.map((s) => ({ name: s.name, slug: s.slug, href: subSubCategoryHref(cat.slug, sub.slug, s.slug), count: n.get(s.id) ?? 0 }));
  }

  const node = subSub ?? sub ?? cat;
  return {
    level: subSub ? 3 : sub ? 2 : 1,
    name: node.name,
    slug: node.slug,
    image: cat.image, // only top-level categories have an image
    href: path[path.length - 1]!.href,
    path,
    children,
    scope: subSub ? { subSubCategoryId: subSub.id } : sub ? { subCategoryId: sub.id } : { categoryId: cat.id },
  };
});

/** One page of the VISIBLE products at or below a category node (shared listing engine). */
export const getCategoryProducts = cache((node: CategoryListingNode, params: ProductListParams): Promise<Paged<ProductCardData>> =>
  // The category page scopes by its path, so a stray ?category= is ignored.
  listProducts(node.scope, { ...params, category: "" }),
);

/** Filter options that exist under a category node: its brands (with counts) and its top final price. */
export const getCategoryFacets = cache((node: CategoryListingNode): Promise<ListingFacets> => listingFacets(node.scope));
