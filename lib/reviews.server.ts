import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteReviewImage, saveReviewImage, UploadError } from "@/lib/uploads";
import { REVIEW_PHOTO_MAX_BYTES, reviewSchema } from "@/lib/validations/review";

export type ReviewResult = { ok: true; message: string; orderNumber: number } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const NOT_ALLOWED = "You can only review products from your own delivered orders.";

/**
 * Creates a verified-buyer review for `customerId` (always the session user — the caller checks it).
 * - the product is read from the purchased line (orderItemId), never taken from the input, so a review
 *   can only be for something this customer actually bought;
 * - that seller's part of the order must be DELIVERED;
 * - one review per purchased line (unique orderItemId — a double submit gets a friendly message);
 * - photos are re-checked by their bytes; the review starts PENDING until an admin approves it.
 */
export async function createReview(customerId: string, input: unknown): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: Object.values(fieldErrors)[0] ?? "Please check your review", fieldErrors };
  }
  const d = parsed.data;

  const item = await prisma.orderItem.findUnique({
    where: { id: d.orderItemId },
    select: {
      productId: true,
      review: { select: { id: true } },
      storeOrder: { select: { status: true, order: { select: { customerId: true, orderNumber: true } } } },
    },
  });
  // Someone else's line or an unknown id get the same answer — nothing to probe.
  if (!item || item.storeOrder.order.customerId !== customerId) return { ok: false, message: NOT_ALLOWED };
  if (item.storeOrder.status !== "DELIVERED") return { ok: false, message: "You can review this item once it has been delivered." };
  if (!item.productId) return { ok: false, message: "This product is no longer available to review." };
  if (item.review) return { ok: false, message: "You've already reviewed this item." };

  const saved: string[] = [];
  try {
    for (const f of d.photos) saved.push(await saveReviewImage(f, REVIEW_PHOTO_MAX_BYTES));
    await prisma.review.create({
      data: {
        productId: item.productId,
        customerId,
        orderItemId: d.orderItemId,
        rating: d.rating,
        title: d.title,
        comment: d.comment,
        images: saved.length ? saved : Prisma.JsonNull,
      },
    });
  } catch (error) {
    await Promise.all(saved.map((p) => deleteReviewImage(p))); // no orphan files
    if (error instanceof UploadError) return { ok: false, message: error.message, fieldErrors: { photos: error.message } };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "You've already reviewed this item." };
    console.error("[reviews] submit failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, message: "We couldn't save your review. Please try again." };
  }
  return { ok: true, message: "Review submitted — pending approval", orderNumber: item.storeOrder.order.orderNumber };
}

// ── Admin moderation ─────────────────────────────────────────────────────────────────────────────

/** Product.ratingAvg (hundredths, integer) and reviewCount from its APPROVED reviews — call inside the same transaction. */
/**
 * A review the storefront shows (and counts toward the product's stars): approved by an admin AND not
 * switched off by one. The single definition used by the storefront and the rating recompute.
 */
export const PUBLISHED_REVIEW = { status: "APPROVED", isVisible: true } as const satisfies Prisma.ReviewWhereInput;

async function recomputeProductRating(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.review.aggregate({ where: { productId, ...PUBLISHED_REVIEW }, _avg: { rating: true }, _count: { _all: true } });
  const count = agg._count._all;
  await tx.product.update({ where: { id: productId }, data: { reviewCount: count, ratingAvg: count ? Math.round((agg._avg.rating ?? 0) * 100) : 0 } });
}

export type ModerateResult = { ok: true; productId: string; slug: string } | { ok: false; error: string };

/**
 * Approve → the review shows on the storefront (unless an admin switched it off); Deny → it's hidden
 * (shown as "Denied"). Either way the product's average / count are recomputed from its published
 * reviews in the same transaction, so the stars on cards and the product page never drift. The caller
 * must have checked the admin role.
 */
export async function moderateReview(reviewId: string, status: "APPROVED" | "REJECTED"): Promise<ModerateResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id: reviewId },
        data: { status, moderatedAt: new Date() },
        select: { productId: true, product: { select: { slug: true } } },
      });
      await recomputeProductRating(tx, r.productId);
      return { ok: true as const, productId: r.productId, slug: r.product.slug };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { ok: false, error: "That review no longer exists." };
    console.error("[reviews] moderation failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "We couldn't update this review. Please try again." };
  }
}

export type VisibilityResult = { ok: true; productId: string; slug: string } | { ok: false; error: string };

/**
 * Show / hide an APPROVED review on the storefront (active / inactive) without changing the moderation
 * decision; the product's stars are recomputed in the same transaction. Only approved reviews can be
 * switched (pending / denied ones aren't shown anyway). The caller must have checked the admin role.
 */
export async function setReviewVisibility(reviewId: string, isVisible: boolean): Promise<VisibilityResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const changed = await tx.review.updateMany({ where: { id: reviewId, status: "APPROVED" }, data: { isVisible } });
      const r = await tx.review.findUnique({ where: { id: reviewId }, select: { productId: true, status: true, product: { select: { slug: true } } } });
      if (!r) return { ok: false as const, error: "That review no longer exists." };
      if (changed.count === 0) return { ok: false as const, error: "Only approved reviews can be shown or hidden. Approve it first." };
      await recomputeProductRating(tx, r.productId);
      return { ok: true as const, productId: r.productId, slug: r.product.slug };
    });
  } catch (error) {
    console.error("[reviews] visibility failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "We couldn't update this review. Please try again." };
  }
}

/** Every review of a product (any status) for the admin product page — pending first, then newest. */
export async function adminProductReviews(productId: string) {
  const rows = await prisma.review.findMany({
    where: { productId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      images: true,
      status: true,
      createdAt: true,
      moderatedAt: true,
      customer: { select: { name: true, email: true } },
      orderItem: { select: { variationName: true, storeOrder: { select: { order: { select: { orderNumber: true } } } } } },
    },
  });
  const rank = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;
  return rows
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      photos: Array.isArray(r.images) ? r.images.filter((x): x is string => typeof x === "string") : [],
      status: r.status,
      createdAt: r.createdAt,
      moderatedAt: r.moderatedAt,
      customerName: r.customer.name,
      customerEmail: r.customer.email,
      variationName: r.orderItem.variationName,
      orderNumber: r.orderItem.storeOrder.order.orderNumber,
    }))
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
export type AdminProductReview = Awaited<ReturnType<typeof adminProductReviews>>[number];
