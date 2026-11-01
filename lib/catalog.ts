/** Storefront category tree (client-safe types + links). Data comes from lib/catalog.server.ts. */

export type CategoryLeaf = { name: string; slug: string };
export type CategoryGroup = CategoryLeaf & { items: CategoryLeaf[] };
export type CategoryNode = CategoryLeaf & { image: string | null; groups: CategoryGroup[] };

/**
 * Category listing links — one page for all three levels (`/category/[...slug]`):
 * /category/fashion · /category/fashion/t-shirt · /category/fashion/t-shirt/man-t-shirt
 */
export const categoryHref = (category: string) => `/category/${category}`;
export const subCategoryHref = (category: string, sub: string) => `/category/${category}/${sub}`;
export const subSubCategoryHref = (category: string, sub: string, subSub: string) => `/category/${category}/${sub}/${subSub}`;

/** A resolved category listing node (any level) with its breadcrumb trail and the next level down. */
export type CategoryListingNode = {
  level: 1 | 2 | 3;
  name: string;
  slug: string;
  image: string | null;
  href: string;
  /** Home-less trail from the top category down to this node (each with its own listing link). */
  path: { name: string; href: string }[];
  /** Active children one level down with their visible product counts (empty at level 3). */
  children: { name: string; slug: string; href: string; count: number }[];
  /** Products at or below this node — the scope every listing query uses. */
  scope: { categoryId: string } | { subCategoryId: string } | { subSubCategoryId: string };
};
