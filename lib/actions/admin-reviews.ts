"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can } from "@/lib/access.server";
import { forbiddenResult } from "@/lib/admin-auth";
import { moderateReview, setReviewVisibility } from "@/lib/reviews.server";

const schema = z.object({ id: z.string().trim().min(1).max(40), decision: z.enum(["APPROVED", "REJECTED"]) });
const visibilitySchema = z.object({ id: z.string().trim().min(1).max(40), isVisible: z.boolean() });

export type ModerateReviewResult = { success: true } | { success: false; error: string };

/** Pages showing a review or its product's stars: the admin review pages, the admin product page, the storefront. */
function revalidateReview(reviewId: string, productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath("/admin", "layout"); // sidebar pending-review count
  revalidatePath("/", "layout"); // stars on cards across the storefront + the product page
}

/**
 * Admin › Approve / Deny a review (product details page and Review Manage). Admin-only; the product's
 * average and review count are recomputed with the change.
 */
export async function moderateReviewAction(input: unknown): Promise<ModerateReviewResult> {
  if (!(await can("reviews", "update"))) return forbiddenResult("reviews");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That review couldn't be found." };
  const res = await moderateReview(parsed.data.id, parsed.data.decision);
  if (!res.ok) return { success: false, error: res.error };
  revalidateReview(parsed.data.id, res.productId);
  return { success: true };
}

/** Admin › Review Manage › show / hide an approved review on the storefront. Admin-only. */
export async function setReviewVisibilityAction(input: unknown): Promise<ModerateReviewResult> {
  if (!(await can("reviews", "update"))) return forbiddenResult("reviews");
  const parsed = visibilitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That review couldn't be found." };
  const res = await setReviewVisibility(parsed.data.id, parsed.data.isVisible);
  if (!res.ok) return { success: false, error: res.error };
  revalidateReview(parsed.data.id, res.productId);
  return { success: true };
}
