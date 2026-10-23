/** Storefront category tree (client-safe types + links). Data comes from lib/catalog.server.ts. */

export type CategoryLeaf = { name: string; slug: string };
export type CategoryGroup = CategoryLeaf & { items: CategoryLeaf[] };
export type CategoryNode = CategoryLeaf & { image: string | null; groups: CategoryGroup[] };

/** Listing links (the category page is built later — CLAUDE.md §5 `/category/[slug]`). */
export const categoryHref = (category: string) => `/category/${category}`;
export const subCategoryHref = (category: string, sub: string) => `/category/${category}?sub=${sub}`;
export const subSubCategoryHref = (category: string, sub: string, subSub: string) => `/category/${category}?sub=${sub}&subsub=${subSub}`;
