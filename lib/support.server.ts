import "server-only";

import { prisma } from "@/lib/db";
import { TICKETS_PAGE_SIZE, type TicketPriority, type TicketStatus, type TicketType } from "@/lib/validations/support";

/** Ticket numbers start here ("#100241"), like order numbers. */
export const FIRST_TICKET_NUMBER = 100_001;

export type TicketRow = { number: number; subject: string; type: TicketType; priority: TicketPriority; status: TicketStatus; createdAt: Date };
export type TicketMessage = { id: string; body: string; fromStaff: boolean; authorName: string | null; createdAt: Date };
export type TicketDetail = TicketRow & { description: string; attachment: string | null; updatedAt: Date; messages: TicketMessage[] };

const rowSelect = { number: true, subject: true, type: true, priority: true, status: true, createdAt: true } as const;

/** Support Ticket list: the customer's own tickets, newest first. Callers pass the session's id. */
export async function listTickets(userId: string, page: number) {
  const total = await prisma.supportTicket.count({ where: { userId } });
  const pageCount = Math.max(1, Math.ceil(total / TICKETS_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows: TicketRow[] = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * TICKETS_PAGE_SIZE,
    take: TICKETS_PAGE_SIZE,
    select: rowSelect,
  });
  return { rows, total, page: current, pageCount };
}

/** One of the customer's own tickets with its replies, oldest first — null when it isn't theirs. */
export async function getTicket(userId: string, number: number): Promise<TicketDetail | null> {
  const t = await prisma.supportTicket.findFirst({
    where: { number, userId },
    select: {
      ...rowSelect,
      description: true,
      attachment: true,
      updatedAt: true,
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, fromStaff: true, createdAt: true, author: { select: { name: true } } } },
    },
  });
  if (!t) return null;
  const { messages, ...rest } = t;
  return { ...rest, messages: messages.map(({ author, ...m }) => ({ ...m, authorName: author?.name ?? null })) };
}
