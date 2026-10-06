/** Routes of the Category Setup pages (admin sidebar → Catalog → Category Setup). */
export const CATEGORY_ROUTES = {
  category: "/admin/categories",
  sub: "/admin/categories/sub",
  subSub: "/admin/categories/sub-sub",
} as const;

export const CATEGORY_PATHS = Object.values(CATEGORY_ROUTES);
