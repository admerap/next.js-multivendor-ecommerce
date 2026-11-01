"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth-guard";
import { accountOrderHref } from "@/lib/orders";
import { createReview } from "@/lib/reviews.server";

export type SubmitReviewResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Order details › Reviews › Submit review — the signed-in customer only; rules in lib/reviews.server. */
export async function submitReview(formData: FormData): Promise<SubmitReviewResult> {
  const user = await requireArea("CUSTOMER");
  const res = await createReview(user.id, {
    orderItemId: formData.get("orderItemId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    comment: formData.get("comment") ?? "",
    photos: formData.getAll("photos").filter((f) => f instanceof File && f.size > 0),
  });
  if (!res.ok) return res;
  revalidatePath(accountOrderHref(res.orderNumber));
  return { ok: true, message: res.message };
}
