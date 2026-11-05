import { z } from "zod";
import { orderFilterLabel, statusFromSlug } from "@/lib/orders";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)));

/**
 * Admin › Order Manage URL: ?status=<slug> (overall status) · ?q · Filter panel: ?store=<vendorId>,
 * ?payment=paid|unpaid|refunded, ?from / ?to (YYYY-MM-DD, inclusive) · ?page · ?pageSize.
 * Anything unknown falls back to "not filtered".
 */
export const adminOrderListSchema = z.object({
  status: z
    .string()
    .optional()
    .catch(undefined)
    .transform((s) => statusFromSlug(s)),
  q: z.string().trim().max(100).catch(""),
  store: z.string().regex(/^[a-z0-9]{1,40}$/i).optional().catch(undefined),
  payment: z.enum(["paid", "unpaid", "refunded"]).optional().catch(undefined),
  from: isoDay.optional().catch(undefined),
  to: isoDay.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type AdminOrderListParams = z.infer<typeof adminOrderListSchema>;

export const ADMIN_PAYMENT_LABEL = { paid: "Paid", unpaid: "Unpaid", refunded: "Refunded" } as const;

/** The list's title: "All Orders" or "<Status> Orders" (the sidebar's wording). */
export const adminOrderListTitle = (p: Pick<AdminOrderListParams, "status">) => (p.status ? `${orderFilterLabel(p.status)} Orders` : "All Orders");
