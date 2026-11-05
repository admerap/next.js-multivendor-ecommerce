import { z } from "zod";
import { ORDER_STATUSES, statusFromSlug } from "@/lib/orders";

/** Seller Center › Order Manage list: ?q, ?status=<slug> (pending, out-for-delivery…), ?page, ?pageSize. */
export const vendorOrderListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  /** URL slug → enum value; anything unknown means "All Orders". */
  status: z
    .string()
    .optional()
    .catch(undefined)
    .transform((s) => statusFromSlug(s)),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type VendorOrderListParams = z.infer<typeof vendorOrderListSchema>;

/** Order details › Change order status. The allowed moves are checked again on the server. */
export const vendorStatusUpdateSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9]{1,40}$/i),
  status: z.enum(ORDER_STATUSES),
});
