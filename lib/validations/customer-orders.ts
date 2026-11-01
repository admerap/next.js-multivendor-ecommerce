import { z } from "zod";

/** Customer › My Order list URL (?q=&status=&sort=&page=). Anything unknown falls back to the default. */
export const customerOrderListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  /** a status slug (pending, out-for-delivery…) or "" for All */
  status: z.string().trim().max(24).regex(/^[a-z-]*$/).catch(""),
  sort: z.enum(["latest", "oldest"]).catch("latest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type CustomerOrderListParams = z.infer<typeof customerOrderListSchema>;

export const CUSTOMER_ORDERS_PAGE_SIZE = 10;

/** Cancel / Hide / Unhide: just the order number — the customer comes from the session. */
export const orderNumberSchema = z.object({ orderNumber: z.number().int().min(1).max(2_000_000_000) });
