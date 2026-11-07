"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { FIRST_TICKET_NUMBER } from "@/lib/support.server";
import { deleteSupportImage, saveSupportImage, UploadError } from "@/lib/uploads";
import { isTicketDone, MAX_OPEN_TICKETS, TICKET_IMAGE_MAX_BYTES, ticketNumberSchema, ticketReplySchema, ticketSchema } from "@/lib/validations/support";

export type SupportResult<T = undefined> =
  ({ success: true; message: string } & (T extends undefined ? object : { data: T })) | { success: false; error: string; fieldErrors?: Record<string, string> };

const GONE = { success: false as const, error: "This ticket no longer exists. Refresh the page." };
const fieldErrorsOf = (issues: { path: PropertyKey[]; message: string }[]) => {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
};

/**
 * Support Ticket › Submit (multipart FormData: subject, type, priority, description, attachment). The owner is the
 * session's customer, never a form field. The image is checked again from its bytes (PNG / JPG, ≤ 5 MB) and stored
 * under a random name. Numbers are sequential; two tickets taking the same one at once retry with the next.
 */
export async function createTicketAction(form: FormData): Promise<SupportResult<{ number: number }>> {
  const user = await requireArea("CUSTOMER");
  const file = form.get("attachment");
  const parsed = ticketSchema.safeParse({
    subject: form.get("subject"),
    type: form.get("type"),
    priority: form.get("priority"),
    description: form.get("description"),
    attachment: file instanceof File && file.size > 0 ? file : null,
  });
  if (!parsed.success) return { success: false, error: "Please check the highlighted fields", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const { attachment, ...t } = parsed.data;

  const open = await prisma.supportTicket.count({ where: { userId: user.id, status: { notIn: ["RESOLVED", "CLOSED"] } } });
  if (open >= MAX_OPEN_TICKETS)
    return { success: false, error: `You have ${MAX_OPEN_TICKETS} open tickets. Please wait for an answer before opening another.` };

  let saved: string | null = null;
  try {
    if (attachment) saved = await saveSupportImage(attachment, TICKET_IMAGE_MAX_BYTES);
    for (let attempt = 0; ; attempt++) {
      try {
        const last = await prisma.supportTicket.aggregate({ _max: { number: true } });
        const number = Math.max(FIRST_TICKET_NUMBER, (last._max.number ?? 0) + 1);
        await prisma.supportTicket.create({ data: { ...t, number, attachment: saved, userId: user.id } });
        revalidatePath("/dashboard/support");
        return { success: true, message: `Ticket #${number} submitted`, data: { number } };
      } catch (error) {
        if (attempt < 4 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { attachment: error.message } };
    await deleteSupportImage(saved);
    console.error("[support] create failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't submit your ticket. Please try again." };
  }
}

/**
 * Ticket detail › Reply: the customer adds a message to their own ticket. It goes back to Open (waiting on staff).
 * Resolved / Closed tickets take no replies.
 */
export async function replyTicketAction(input: unknown): Promise<SupportResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = ticketReplySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Write a reply.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  try {
    const t = await prisma.supportTicket.findFirst({ where: { number: parsed.data.number, userId: user.id }, select: { id: true, status: true } });
    if (!t) return GONE;
    if (isTicketDone(t.status)) return { success: false, error: "This ticket is closed. Open a new ticket if you still need help." };
    await prisma.$transaction([
      prisma.supportTicketMessage.create({ data: { ticketId: t.id, authorId: user.id, body: parsed.data.body } }),
      prisma.supportTicket.update({ where: { id: t.id }, data: { status: "OPEN" } }),
    ]);
    revalidatePath("/dashboard/support", "layout");
    return { success: true, message: "Reply sent" };
  } catch (error) {
    console.error("[support] reply failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't send your reply. Please try again." };
  }
}

/** Ticket detail › Close ticket: the customer's issue is sorted; the ticket becomes Closed. */
export async function closeTicketAction(input: unknown): Promise<SupportResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = ticketNumberSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const r = await prisma.supportTicket.updateMany({
      where: { number: parsed.data.number, userId: user.id, status: { not: "CLOSED" } },
      data: { status: "CLOSED" },
    });
    if (r.count === 0) return GONE;
    revalidatePath("/dashboard/support", "layout");
    return { success: true, message: "Ticket closed" };
  } catch (error) {
    console.error("[support] close failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't close the ticket. Please try again." };
  }
}
