"use server";

import { revalidatePath } from "next/cache";
import { can, getAccess } from "@/lib/access.server";
import { forbiddenResult } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { staffReplySchema, ticketStatusSchema } from "@/lib/validations/admin-support";
import { TICKET_STATUS_LABEL } from "@/lib/validations/support";

export type AdminSupportResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string> };

const GONE = { success: false as const, error: "This ticket no longer exists. Refresh the page." };

/** The admin queue + sidebar count, and the customer's own ticket pages. */
function refresh(number: number) {
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${number}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard/support", "layout");
}

/**
 * Admin › Support Tickets › Reply: a staff message on the ticket (author from the session) and the status it moves
 * to — Answered by default. Needs Support Tickets › Update.
 */
export async function staffReplyAction(input: unknown): Promise<AdminSupportResult> {
  if (!(await can("support", "update"))) return forbiddenResult("support tickets");
  const me = await getAccess();
  const parsed = staffReplySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { success: false, error: parsed.error.issues[0]?.message ?? "Write a reply.", fieldErrors };
  }
  const { number, body, status } = parsed.data;
  try {
    const t = await prisma.supportTicket.findUnique({ where: { number }, select: { id: true } });
    if (!t) return GONE;
    await prisma.$transaction([
      prisma.supportTicketMessage.create({ data: { ticketId: t.id, authorId: me?.userId ?? null, fromStaff: true, body } }),
      prisma.supportTicket.update({ where: { id: t.id }, data: { status } }),
    ]);
    refresh(number);
    return { success: true, message: `Reply sent · ${TICKET_STATUS_LABEL[status]}` };
  } catch (error) {
    console.error("[admin-support] reply failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't send the reply. Please try again." };
  }
}

/** Admin › Support Tickets › Status: move a ticket (e.g. Resolved, or Pending while waiting on the customer). */
export async function setTicketStatusAction(input: unknown): Promise<AdminSupportResult> {
  if (!(await can("support", "update"))) return forbiddenResult("support tickets");
  const parsed = ticketStatusSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const r = await prisma.supportTicket.updateMany({ where: { number: parsed.data.number }, data: { status: parsed.data.status } });
    if (r.count === 0) return GONE;
    refresh(parsed.data.number);
    return { success: true, message: `Ticket marked ${TICKET_STATUS_LABEL[parsed.data.status]}` };
  } catch (error) {
    console.error("[admin-support] status failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't change the status. Please try again." };
  }
}
