import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sanitizeDescription } from "@/lib/rich-text.server";

const INCLUDE = {
  category: { select: { name: true } },
  subCategory: { select: { name: true } },
  subSubCategory: { select: { name: true } },
  brand: { select: { name: true } },
  images: { orderBy: { position: "asc" }, select: { url: true } },
  variations: { orderBy: { position: "asc" } },
  vendor: { select: { id: true, storeName: true, logo: true, _count: { select: { products: true } } } },
} satisfies Prisma.ProductInclude;

async function load(where: Prisma.ProductWhereInput) {
  const p = await prisma.product.findFirst({ where, include: INCLUDE });
  if (!p) return null;

  const tags = Array.isArray(p.tags) ? (p.tags as unknown[]).filter((t): t is string => typeof t === "string") : [];
  const discountCents = p.discountType === "PERCENT" ? Math.round((p.price * p.discountValue) / 100) : p.discountValue;
  const totalStock = p.variations.length ? p.variations.reduce((n, v) => n + v.stock, 0) : p.stock;

  return {
    ...p,
    // Sanitized again on the way out (defense in depth; it was sanitized on save too).
    description: sanitizeDescription(p.description),
    tags,
    categoryPath: [p.category.name, p.subCategory?.name, p.subSubCategory?.name].filter((x): x is string => !!x),
    images: [p.thumbnail, ...p.images.map((i) => i.url)].filter((x): x is string => !!x),
    finalPrice: Math.max(0, p.price - discountCents),
    discountCents,
    totalStock,
  };
}

/** One of THIS vendor's products with everything the details page shows; null = 404. */
export function getProductDetail(id: string, vendorId: string) {
  return load({ id, vendorId });
}

/** Any store's product, for the admin details page (the caller must have checked the ADMIN role); null = 404. */
export function getAdminProductDetail(id: string) {
  return load({ id });
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof load>>>;
