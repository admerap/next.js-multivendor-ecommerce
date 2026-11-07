import { z } from "zod";

/**
 * Vendor › Product Reviews (vendorproductreview design). The store reads every review on its products and answers
 * them; it can't change a review's status — moderation (approve / deny / hide) is the Sundry team's.
 */

/** How a review stands, in the store's words: Pending (being checked), Published, Hidden (by Sundry), Denied. */
export const VENDOR_REVIEW_STATUSES = ["published", "pending", "hidden", "denied"] as const;
export type VendorReviewStatus = (typeof VENDOR_REVIEW_STATUSES)[number];
export const VENDOR_REVIEW_STATUS_LABEL: Record<VendorReviewStatus, string> = {
  published: "Published",
  pending: "Pending",
  hidden: "Hidden",
  denied: "Denied",
};
export const VENDOR_REVIEW_STATUS_TONE = { published: "success", pending: "warning", hidden: "neutral", denied: "error" } as const;

export const reviewStatusOf = (r: { status: "PENDING" | "APPROVED" | "REJECTED"; isVisible: boolean }): VendorReviewStatus =>
  r.status === "PENDING" ? "pending" : r.status === "REJECTED" ? "denied" : r.isVisible ? "published" : "hidden";

/** URL: ?q (review ID, product, reviewer, text) · ?status · ?rating=1..5 · ?reply=replied|unreplied · ?page · ?pageSize. */
export const vendorReviewListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum([...VENDOR_REVIEW_STATUSES, "ALL"]).catch("ALL"),
  rating: z.enum(["1", "2", "3", "4", "5", "ALL"]).catch("ALL"),
  reply: z.enum(["replied", "unreplied", "ALL"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(10),
});
export type VendorReviewListParams = z.infer<typeof vendorReviewListSchema>;

export const REVIEW_REPLY_MAX = 1000;
export const reviewReplySchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{1,40}$/i, "That review couldn't be found."),
  reply: z
    .string("Write your reply.")
    .trim()
    .min(2, "Write your reply.")
    .max(REVIEW_REPLY_MAX, `Keep your reply under ${REVIEW_REPLY_MAX.toLocaleString("en-US")} characters.`),
});
export const reviewIdSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{1,40}$/i),
});
