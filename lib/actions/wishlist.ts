"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { VISIBLE } from "@/lib/storefront.server";

const productId = z.string().trim().min(1).max(40);
const guestIdsSchema = z.array(productId).max(200).catch([]);
const setSchema = z.object({ productId, on: z.boolean() });

/** The signed-in CUSTOMER's id, or null (guests and vendor / admin accounts have no wishlist). */
async function customerId() {
  const session = await auth();
  return session?.user?.role === "CUSTOMER" ? session.user.id : null;
}

/** account: a customer's list. Otherwise signedIn says whether it's a guest (→ sign in) or a vendor / admin account. */
export type WishlistSync = { account: true; ids: string[] } | { account: false; signedIn: boolean };

/**
 * Called once when the storefront loads. The wishlist needs a customer account: for a signed-in
 * customer the account's list comes back — after adding any products a guest saved in this browser
 * with the older browser-only wishlist (one-time; only products still on the storefront; duplicates
 * ignored). Anyone else gets { account: false } and is asked to sign in when they tap a heart.
 */
export async function syncWishlist(guestIds: unknown): Promise<WishlistSync> {
  const session = await auth();
  const me = session?.user?.role === "CUSTOMER" ? session.user.id : null;
  if (!me) return { account: false, signedIn: !!session?.user };
  const incoming = [...new Set(guestIdsSchema.parse(guestIds))];
  try {
    if (incoming.length > 0) {
      const visible = await prisma.product.findMany({ where: { ...VISIBLE, id: { in: incoming } }, select: { id: true } });
      if (visible.length > 0) {
        await prisma.wishlistItem.createMany({ data: visible.map((p) => ({ customerId: me, productId: p.id })), skipDuplicates: true });
        revalidatePath("/dashboard/wishlist");
      }
    }
    const rows = await prisma.wishlistItem.findMany({ where: { customerId: me }, orderBy: { createdAt: "desc" }, select: { productId: true } });
    return { account: true, ids: rows.map((r) => r.productId) };
  } catch (error) {
    console.error("[wishlist] sync failed:", error instanceof Error ? error.name : "unknown");
    return { account: true, ids: [] };
  }
}

export type WishlistSetResult = { ok: true; on: boolean } | { ok: false; reason: "AUTH" | "UNAVAILABLE" | "SERVER"; message: string };

/**
 * Heart on a product (card, quick view, product page, wishlist page): saves or removes it for the
 * signed-in customer. Takes the wanted state (not a blind toggle), so a double click or a retry can't
 * flip it twice; saving twice is a no-op (unique customer + product). Only storefront-visible products
 * can be added; removing always works.
 */
export async function setWishlisted(input: unknown): Promise<WishlistSetResult> {
  const me = await customerId();
  if (!me) return { ok: false, reason: "AUTH", message: "Sign in to save products to your wishlist." };
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "UNAVAILABLE", message: "That product couldn't be found." };
  const { productId: id, on } = parsed.data;
  try {
    if (on) {
      const exists = await prisma.product.count({ where: { ...VISIBLE, id } });
      if (!exists) return { ok: false, reason: "UNAVAILABLE", message: "This product is no longer available." };
      await prisma.wishlistItem.upsert({ where: { customerId_productId: { customerId: me, productId: id } }, create: { customerId: me, productId: id }, update: {} });
    } else {
      await prisma.wishlistItem.deleteMany({ where: { customerId: me, productId: id } });
    }
  } catch (error) {
    console.error("[wishlist] update failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "SERVER", message: "We couldn't update your wishlist. Please try again." };
  }
  revalidatePath("/dashboard/wishlist");
  return { ok: true, on };
}
