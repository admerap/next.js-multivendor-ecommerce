import "server-only";

import { prisma } from "@/lib/db";
import type { ProductCardData } from "@/lib/storefront";
import { CARD_SELECT, toCard, VISIBLE } from "@/lib/storefront.server";

export type WishlistEntry =
  | { available: true; product: ProductCardData; brand: string | null; savedAt: Date }
  | { available: false; id: string; name: string; image: string | null; sellerName: string; savedAt: Date };

/**
 * THIS customer's wishlist (account › Wish List), newest first. Products still on the storefront come
 * back as full card data (price, discount, seller, rating, stock); one that has since been hidden,
 * denied or whose store / category went offline comes back as "no longer available" so the customer
 * can still see and remove it — nothing silently disappears and nothing crashes.
 */
export async function getWishlist(customerId: string): Promise<WishlistEntry[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, product: { select: { ...CARD_SELECT, brand: { select: { name: true } } } } },
  });
  if (rows.length === 0) return [];
  const visible = new Set((await prisma.product.findMany({ where: { ...VISIBLE, id: { in: rows.map((r) => r.product.id) } }, select: { id: true } })).map((p) => p.id));
  return rows.map(({ product: p, createdAt }) =>
    visible.has(p.id)
      ? { available: true, product: toCard(p), brand: p.brand?.name ?? null, savedAt: createdAt }
      : { available: false, id: p.id, name: p.name, image: p.thumbnail, sellerName: p.vendor.storeName, savedAt: createdAt },
  );
}
