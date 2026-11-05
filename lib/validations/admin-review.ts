import { z } from "zod";

/** Admin wording of a review's moderation status (REJECTED shows as "Denied" in every UI — CLAUDE.md). */
export const ADMIN_REVIEW_STATUS_LABEL = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Denied" } as const;
export const ADMIN_REVIEW_STATUS_TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "error" } as const;

/** URL slug ↔ status (?status=pending|approved|denied), like the product / coupon queues. */
export const REVIEW_STATUS_SLUGS = { pending: "PENDING", approved: "APPROVED", denied: "REJECTED" } as const;
export type ReviewStatusSlug = keyof typeof REVIEW_STATUS_SLUGS;

/**
 * Admin › Review Manage › Customer Review URL: ?status · ?q (review ID, product, customer) · Filter
 * panel: ?rating=1..5, ?store=<vendorId>, ?visibility=visible|hidden · ?page · ?pageSize.
 */
export const adminReviewListSchema = z.object({
  status: z.enum(["pending", "approved", "denied"]).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  store: z.string().regex(/^[a-z0-9]{1,40}$/i).optional().catch(undefined),
  visibility: z.enum(["visible", "hidden"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type AdminReviewListParams = z.infer<typeof adminReviewListSchema>;

/** Short, human review reference shown in the admin (the id's tail): "#R-4K2X9Q". */
export const reviewRef = (id: string) => `R-${id.slice(-6).toUpperCase()}`;
