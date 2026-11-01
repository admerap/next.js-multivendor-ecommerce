"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { forbiddenResult, isAdmin } from "@/lib/admin-auth";
import { moderateReview } from "@/lib/reviews.server";

const schema = z.object({ id: z.string().trim().min(1).max(40), decision: z.enum(["APPROVED", "REJECTED"]) });

export type ModerateReviewResult = { success: true } | { success: false; error: string };

/**
 * Admin › Product details › Product reviews › Approve / Deny. Admin-only; the product's average and
 * review count are recomputed with the change. Stars show on cards across the storefront, so every
 * storefront page is refreshed, plus this admin page.
 */
export async function moderateReviewAction(input: unknown): Promise<ModerateReviewResult> {
  if (!(await isAdmin())) return forbiddenResult("reviews");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That review couldn't be found." };
  const res = await moderateReview(parsed.data.id, parsed.data.decision);
  if (!res.ok) return { success: false, error: res.error };
  revalidatePath(`/admin/products/${res.productId}`);
  revalidatePath("/", "layout");
  return { success: true };
}
