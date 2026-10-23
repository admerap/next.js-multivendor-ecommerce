import "server-only";

import { cache } from "react";
import type { CategoryNode } from "@/lib/catalog";
import { prisma } from "@/lib/db";

/**
 * The 3-level storefront category tree: ACTIVE categories → ACTIVE sub-categories → ACTIVE
 * sub-sub-categories, alphabetical. `cache` dedupes it per request (header + home hero share one query).
 * Inactive branches are hidden; a level with no children still shows (its link opens the listing).
 */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await prisma.category.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      image: true,
      subCategories: {
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: {
          name: true,
          slug: true,
          subSubCategories: { where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { name: true, slug: true } },
        },
      },
    },
  });
  return rows.map((c) => ({
    name: c.name,
    slug: c.slug,
    image: c.image,
    groups: c.subCategories.map((s) => ({ name: s.name, slug: s.slug, items: s.subSubCategories })),
  }));
});
