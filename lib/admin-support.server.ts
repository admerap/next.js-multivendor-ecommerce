import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TicketMessage, TicketRow } from "@/lib/support.server";
import { TICKET_STATUS_SLUGS, type AdminTicketListParams } from "@/lib/validations/admin-support";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/validations/support";

export type AdminTicketRow = TicketRow & { customer: { id: string; name: string; email: string }; replies: number };
export type AdminTicket = AdminTicketRow & {
  description: string;
  attachment: string | null;
  updatedAt: Date;
  customer: AdminTicketRow["customer"] & { phone: string | null; createdAt: Date };
  messages: TicketMessage[];
};

const customerSelect = { id: true, name: true, email: true } as const;

/**
 * Admin › Support Tickets: every customer's tickets — status tabs, search (ticket number, subject, customer name or
 * email), priority / type filters. The queue order: Open first (then Pending, Answered…), most urgent first, newest.
 */
export async function listAdminTickets(params: AdminTicketListParams, { all = false }: { all?: boolean } = {}) {
  const { q, priority, type } = params;
  const number = /^#?\d{1,10}$/.test(q) ? Number(q.replace("#", "")) : null;
  const filters: Prisma.SupportTicketWhereInput = {
    ...(priority && { priority }),
    ...(type && { type }),
    ...(q && {
      OR: [
        ...(number !== null && Number.isSafeInteger(number) ? [{ number }] : []),
        { subject: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
      ],
    }),
  };
  const where: Prisma.SupportTicketWhereInput = { ...filters, ...(params.status && { status: TICKET_STATUS_SLUGS[params.status] }) };

  const [byStatus, platformTotal, total] = await Promise.all([
    prisma.supportTicket.groupBy({ by: ["status"], where: filters, _count: { _all: true } }),
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where }),
  ]);
  const pageSize = all ? Math.max(1, total) : params.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const found = await prisma.supportTicket.findMany({
    where,
    // MySQL sorts an ENUM by its declared order: OPEN … CLOSED, URGENT … LOW.
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      number: true,
      subject: true,
      type: true,
      priority: true,
      status: true,
      createdAt: true,
      user: { select: customerSelect },
      _count: { select: { messages: true } },
    },
  });

  const counts = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as Record<TicketStatus, number>;
  for (const r of byStatus) counts[r.status] = r._count._all;
  const rows: AdminTicketRow[] = found.map(({ user, _count, ...t }) => ({ ...t, customer: user, replies: _count.messages }));
  return { rows, counts, platformTotal, total, page, pageCount, pageSize };
}

/** One ticket with its customer and every reply (oldest first). Unknown number → null. */
export async function getAdminTicket(number: number): Promise<AdminTicket | null> {
  const t = await prisma.supportTicket.findUnique({
    where: { number },
    select: {
      number: true,
      subject: true,
      type: true,
      priority: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      description: true,
      attachment: true,
      user: { select: { ...customerSelect, phone: true, createdAt: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, fromStaff: true, createdAt: true, author: { select: { name: true } } } },
    },
  });
  if (!t) return null;
  const { user, messages, ...rest } = t;
  return { ...rest, customer: user, replies: messages.length, messages: messages.map(({ author, ...m }) => ({ ...m, authorName: author?.name ?? null })) };
}
