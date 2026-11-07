import { z } from "zod";
import { TICKET_BODY_MAX, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES } from "@/lib/validations/support";

/** URL slug ↔ status (?status=open|pending|answered|resolved|closed). */
export const TICKET_STATUS_SLUGS = { open: "OPEN", pending: "PENDING", answered: "ANSWERED", resolved: "RESOLVED", closed: "CLOSED" } as const;
export type TicketStatusSlug = keyof typeof TICKET_STATUS_SLUGS;

/** Admin › Support Tickets URL: ?status · ?q (ticket number, subject, customer) · ?priority · ?type · ?page · ?pageSize. */
export const adminTicketListSchema = z.object({
  status: z.enum(["open", "pending", "answered", "resolved", "closed"]).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  priority: z.enum(TICKET_PRIORITIES).optional().catch(undefined),
  type: z.enum(TICKET_TYPES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(10),
});
export type AdminTicketListParams = z.infer<typeof adminTicketListSchema>;

/** Staff reply: the message and the status the ticket moves to (Answered unless staff picks another). */
export const staffReplySchema = z.object({
  number: z.coerce.number().int().positive(),
  body: z
    .string("Write a reply.")
    .trim()
    .min(2, "Write a reply.")
    .max(TICKET_BODY_MAX, `Keep it under ${TICKET_BODY_MAX.toLocaleString("en-US")} characters.`),
  status: z.enum(TICKET_STATUSES).default("ANSWERED"),
});
export const ticketStatusSchema = z.object({ number: z.coerce.number().int().positive(), status: z.enum(TICKET_STATUSES) });
