"use server";

import { z } from "zod";
import type { QuickViewProduct } from "@/lib/storefront";
import { getQuickViewProduct } from "@/lib/storefront.server";

const slugSchema = z.string().trim().min(1).max(220).regex(/^[a-z0-9-]+$/);

/**
 * Quick-view data, loaded when a shopper opens the modal. Public (no login): it returns only what a
 * product card already shows plus gallery/variations, and only for VISIBLE products (else null).
 */
export async function getQuickView(slug: unknown): Promise<{ success: boolean; data?: QuickViewProduct | null; error?: string }> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { success: true, data: null };
  try {
    return { success: true, data: await getQuickViewProduct(parsed.data) };
  } catch (error) {
    console.error("[quick view] failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load this product. Please try again." };
  }
}
