"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { productHref } from "@/lib/storefront";
import { currentVendorId } from "@/lib/vendor-auth";
import { listVendorReviews, type VendorReviewRow } from "@/lib/vendor-reviews.server";
import { reviewIdSchema, reviewReplySchema, vendorReviewListSchema } from "@/lib/validations/vendor-review";

export type VendorReviewResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string> };

const SIGNED_OUT = "Your session has expired. Please sign in again.";
const GONE = "That review couldn't be found.";

/** The list for the page and the export (the store comes from the session — never from the request). */
export async function getVendorReviews(input: unknown): Promise<{ success: boolean; error?: string; data?: { items: VendorReviewRow[]; pageCount: number } }> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SIGNED_OUT };
  return { success: true, data: await listVendorReviews(vendorId, vendorReviewListSchema.parse(input ?? {})) };
}

/** The pages that show a review's reply: this list, the product page and the customer's order. */
function refresh(slug: string) {
  revalidatePath("/vendor/reviews");
  revalidatePath(productHref(slug));
  revalidatePath("/dashboard/orders", "layout");
  revalidatePath("/admin/reviews", "layout");
}

/**
 * Product Reviews › Reply: the store's public answer to a review of one of ITS products (checked on the server).
 * Sending again replaces the reply. The review's status is untouched — moderation is the Sundry team's.
 */
export async function replyToReviewAction(input: unknown): Promise<VendorReviewResult> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SIGNED_OUT };
  const parsed = reviewReplySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { success: false, error: parsed.error.issues[0]?.message ?? "Write your reply.", fieldErrors };
  }
  try {
    const review = await prisma.review.findFirst({
      where: { id: parsed.data.id, product: { vendorId } },
      select: { id: true, reply: true, product: { select: { slug: true } } },
    });
    if (!review) return { success: false, error: GONE };
    await prisma.review.update({ where: { id: review.id }, data: { reply: parsed.data.reply, repliedAt: new Date() } });
    refresh(review.product.slug);
    return { success: true, message: review.reply ? "Reply updated" : "Reply sent" };
  } catch (error) {
    console.error("[vendor-reviews] reply failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't send your reply. Please try again." };
  }
}

/** Product Reviews › Remove reply (the store's own answer). */
export async function removeReviewReplyAction(input: unknown): Promise<VendorReviewResult> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SIGNED_OUT };
  const parsed = reviewIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: GONE };
  try {
    const review = await prisma.review.findFirst({
      where: { id: parsed.data.id, product: { vendorId } },
      select: { id: true, product: { select: { slug: true } } },
    });
    if (!review) return { success: false, error: GONE };
    await prisma.review.update({ where: { id: review.id }, data: { reply: null, repliedAt: null } });
    refresh(review.product.slug);
    return { success: true, message: "Reply removed" };
  } catch (error) {
    console.error("[vendor-reviews] remove reply failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't remove your reply. Please try again." };
  }
}
