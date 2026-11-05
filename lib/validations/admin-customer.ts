import { z } from "zod";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)));

/** Customer List sort (admincustomerlist design). The first one is the default and stays out of the URL. */
export const CUSTOMER_SORTS = { newest: "Newest first", oldest: "Oldest first", orders: "Most orders", name: "Name A–Z" } as const;

/**
 * Admin › Review Manage › Customer List URL: ?q (name, email, phone) · Filter panel: ?ordered (ordered
 * on or after), ?joined (joined on or after), ?status=active|blocked, ?sort · ?page · ?pageSize.
 */
export const adminCustomerListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  ordered: isoDay.optional().catch(undefined),
  joined: isoDay.optional().catch(undefined),
  status: z.enum(["active", "blocked"]).optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "orders", "name"]).catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type AdminCustomerListParams = z.infer<typeof adminCustomerListSchema>;

/** Block / Unblock (admin only). */
export const customerBlockSchema = z.object({ id: z.string().trim().regex(/^[a-z0-9]{1,40}$/i), blocked: z.boolean() });
