import { z } from "zod";

/** Support Ticket (supportticket design): what a customer may send. Shared by the form and the server. */

export const TICKET_TYPES = ["WEBSITE", "ORDER", "PAYMENT", "SELLER", "ACCOUNT"] as const;
export const TICKET_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export const TICKET_STATUSES = ["OPEN", "PENDING", "ANSWERED", "RESOLVED", "CLOSED"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  WEBSITE: "Website problem",
  ORDER: "Order issue",
  PAYMENT: "Payment & refund",
  SELLER: "Seller complaint",
  ACCOUNT: "Account & login",
};
export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = { URGENT: "Urgent", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  ANSWERED: "Answered",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
/** Badge tones from the design (Open info · Pending warning · Answered / Resolved success · Closed neutral). */
export const TICKET_STATUS_TONE = { OPEN: "info", PENDING: "warning", ANSWERED: "success", RESOLVED: "success", CLOSED: "neutral" } as const;
export const TICKET_PRIORITY_TONE = { URGENT: "error", HIGH: "warning", MEDIUM: "primary", LOW: "neutral" } as const;
/** Resolved / Closed tickets take no more replies — the customer opens a new one. */
export const isTicketDone = (s: TicketStatus) => s === "RESOLVED" || s === "CLOSED";

export const TICKETS_PAGE_SIZE = 10;
export const TICKET_SUBJECT_MAX = 150;
export const TICKET_BODY_MAX = 5000;
export const TICKET_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TICKET_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
/** Open (not Resolved / Closed) tickets a customer may have at once — stops floods. */
export const MAX_OPEN_TICKETS = 20;

const body = (what: string) =>
  z
    .string(`Describe your ${what}.`)
    .trim()
    .min(10, `Describe your ${what} in at least 10 characters.`)
    .max(TICKET_BODY_MAX, `Keep it under ${TICKET_BODY_MAX.toLocaleString("en-US")} characters.`);

const image = z
  .instanceof(File)
  .refine((f) => f.size <= TICKET_IMAGE_MAX_BYTES, "The image must be 5 MB or smaller.")
  .refine((f) => (TICKET_IMAGE_TYPES as readonly string[]).includes(f.type), "Attach a PNG or JPG image.")
  .nullable();

export const ticketSchema = z.object({
  subject: z
    .string("Enter a subject.")
    .trim()
    .min(4, "Enter a subject (at least 4 characters).")
    .max(TICKET_SUBJECT_MAX, `Keep the subject under ${TICKET_SUBJECT_MAX} characters.`),
  type: z.enum(TICKET_TYPES, "Choose a type."),
  priority: z.enum(TICKET_PRIORITIES, "Choose a priority."),
  description: body("issue"),
  attachment: image,
});
export type TicketInput = z.input<typeof ticketSchema>;

export const ticketReplySchema = z.object({
  number: z.coerce.number().int().positive(),
  body: z
    .string("Write a reply.")
    .trim()
    .min(2, "Write a reply.")
    .max(TICKET_BODY_MAX, `Keep it under ${TICKET_BODY_MAX.toLocaleString("en-US")} characters.`),
});
export const ticketNumberSchema = z.object({ number: z.coerce.number().int().positive() });
export const ticketListSchema = z.object({ page: z.coerce.number().int().min(1).max(10_000).catch(1) });
