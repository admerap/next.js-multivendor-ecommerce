import "server-only";

import type { ChatSide, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import type { ChatConversation, ChatCounterpart, ChatMessage, ThreadUpdate } from "@/lib/chat";
import { prisma } from "@/lib/db";
import { sellerHref } from "@/lib/storefront";

/**
 * Customer ↔ store chat (PRD FR-A10 / FR-V13). One Conversation per (customer, store) pair — enforced by the
 * @@unique([customerId, vendorId]) index, so starting a chat twice (even two clicks at once) reopens the same
 * thread.
 *
 * Access: every read and write goes through `participant(viewer)`, built from the server session only — a
 * customer's own id, or the signed-in approved vendor's store id. A conversation the caller isn't in is
 * treated exactly like one that doesn't exist (null), so ids can't be probed.
 */

// ── Who's asking ──────────────────────────────────────────────────────────────

export type ChatViewer = { side: "CUSTOMER"; customerId: string; userId: string } | { side: "VENDOR"; vendorId: string; userId: string };

/** The signed-in customer, or the signed-in APPROVED vendor; null for guests, admins and pending stores. */
export async function chatViewer(): Promise<ChatViewer | null> {
  const me = (await auth())?.user;
  if (!me?.id) return null;
  if (me.role === "CUSTOMER") return { side: "CUSTOMER", customerId: me.id, userId: me.id };
  if (me.role === "VENDOR" && me.vendorStatus === "APPROVED" && me.vendorId) return { side: "VENDOR", vendorId: me.vendorId, userId: me.id };
  return null;
}

const participant = (v: ChatViewer): Prisma.ConversationWhereInput => (v.side === "CUSTOMER" ? { customerId: v.customerId } : { vendorId: v.vendorId });
const otherSide = (v: ChatViewer): ChatSide => (v.side === "CUSTOMER" ? "VENDOR" : "CUSTOMER");

// ── Start (product page) ──────────────────────────────────────────────────────

export type StartChatResult = { ok: true; conversationId: string } | { ok: false; reason: "store-unavailable" };

/**
 * The conversation between this customer and store — the existing one, or a new one. `productId` (the page it
 * was started from) is kept only when the product belongs to that store, and only on creation: an existing
 * thread keeps its original context. Only APPROVED stores can be contacted.
 */
export async function findOrCreateConversation(customerId: string, vendorId: string, productId?: string): Promise<StartChatResult> {
  const [store, product] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { status: true } }),
    productId ? prisma.product.findFirst({ where: { id: productId, vendorId }, select: { id: true } }) : null,
  ]);
  if (!store || store.status !== "APPROVED") return { ok: false, reason: "store-unavailable" };

  const conversation = await prisma.conversation.upsert({
    where: { customerId_vendorId: { customerId, vendorId } },
    update: {},
    create: { customerId, vendorId, productId: product?.id ?? null },
    select: { id: true },
  });
  return { ok: true, conversationId: conversation.id };
}

// ── Conversations ─────────────────────────────────────────────────────────────

const CONVERSATION_SELECT = {
  id: true,
  lastMessageAt: true,
  product: { select: { name: true, slug: true, thumbnail: true } },
  customer: { select: { name: true, image: true, createdAt: true } },
  vendor: { select: { storeName: true, logo: true, slug: true } },
  messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { text: true, image: true, senderRole: true, createdAt: true } },
} satisfies Prisma.ConversationSelect;
type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_SELECT }>;

const monthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

function counterpartOf(v: ChatViewer, c: ConversationRow): ChatCounterpart {
  return v.side === "CUSTOMER"
    ? { name: c.vendor.storeName, image: c.vendor.logo, href: sellerHref(c.vendor.slug), subtitle: "Verified seller" }
    : { name: c.customer.name ?? "Customer", image: c.customer.image, href: null, subtitle: `Customer since ${monthYear(c.customer.createdAt)}` };
}

function toConversation(v: ChatViewer, c: ConversationRow, unread: number): ChatConversation {
  const last = c.messages[0];
  return {
    id: c.id,
    counterpart: counterpartOf(v, c),
    product: c.product ? { name: c.product.name, slug: c.product.slug, image: c.product.thumbnail } : null,
    lastMessage: last ? { text: last.text, hasImage: !!last.image, mine: last.senderRole === v.side, createdAt: last.createdAt.toISOString() } : null,
    lastMessageAt: c.lastMessageAt.toISOString(),
    unread,
  };
}

/**
 * The caller's conversations, newest activity first, with unread counts. A store only sees threads that have at
 * least one message (opening a chat from the product page creates an empty one on the customer's side only).
 */
export async function listConversations(v: ChatViewer): Promise<ChatConversation[]> {
  const rows = await prisma.conversation.findMany({
    where: { ...participant(v), ...(v.side === "VENDOR" && { messages: { some: {} } }) },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { ...CONVERSATION_SELECT, _count: { select: { messages: { where: { senderRole: otherSide(v), readAt: null } } } } },
  });
  return rows.map((c) => toConversation(v, c, c._count.messages));
}

/** One of the caller's conversations (header data), or null if it doesn't exist / isn't theirs. */
export async function getConversation(v: ChatViewer, id: string): Promise<ChatConversation | null> {
  const c = await prisma.conversation.findFirst({
    where: { id, ...participant(v), ...(v.side === "VENDOR" && { messages: { some: {} } }) },
    select: { ...CONVERSATION_SELECT, _count: { select: { messages: { where: { senderRole: otherSide(v), readAt: null } } } } },
  });
  return c ? toConversation(v, c, c._count.messages) : null;
}

/** Total unread messages across the caller's conversations (sidebar / nav badges). */
export async function unreadTotal(v: ChatViewer): Promise<number> {
  return prisma.message.count({ where: { senderRole: otherSide(v), readAt: null, conversation: participant(v) } });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export const THREAD_PAGE = 40;
const MESSAGE_SELECT = { id: true, senderRole: true, text: true, image: true, createdAt: true, readAt: true } satisfies Prisma.MessageSelect;
type MessageRow = Prisma.MessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const toMessage = (v: ChatViewer, m: MessageRow): ChatMessage => ({
  id: m.id,
  mine: m.senderRole === v.side,
  text: m.text,
  image: m.image,
  createdAt: m.createdAt.toISOString(),
  readAt: m.senderRole === v.side ? (m.readAt?.toISOString() ?? null) : null,
});

/** Ownership check shared by every message operation. */
const owns = (v: ChatViewer, id: string) => prisma.conversation.findFirst({ where: { id, ...participant(v) }, select: { id: true } });

/** How far the other side has read the caller's messages (for "Seen"). */
async function readUpTo(v: ChatViewer, conversationId: string): Promise<string | null> {
  const r = await prisma.message.aggregate({ where: { conversationId, senderRole: v.side, readAt: { not: null } }, _max: { readAt: true } });
  return r._max.readAt?.toISOString() ?? null;
}

/** A position in a thread: messages strictly after / before (createdAt, id) — stable even within one millisecond. */
export type Cursor = { at: Date; id: string };
const afterCursor = (c: Cursor): Prisma.MessageWhereInput => ({ OR: [{ createdAt: { gt: c.at } }, { createdAt: c.at, id: { gt: c.id } }] });
const beforeCursor = (c: Cursor): Prisma.MessageWhereInput => ({ OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] });

/**
 * A page of a thread, oldest → newest. No cursor: the latest THREAD_PAGE messages. `after`: only what arrived
 * since (polling). `before`: the page of older messages above it ("Load earlier"). null if not the caller's.
 */
export async function getMessages(v: ChatViewer, conversationId: string, cursor?: { after?: Cursor; before?: Cursor }): Promise<(ThreadUpdate & { hasOlder: boolean }) | null> {
  if (!(await owns(v, conversationId))) return null;
  const where: Prisma.MessageWhereInput = { conversationId, ...(cursor?.after && afterCursor(cursor.after)), ...(cursor?.before && beforeCursor(cursor.before)) };

  let rows: MessageRow[];
  let hasOlder = false;
  if (cursor?.after) {
    rows = await prisma.message.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 200, select: MESSAGE_SELECT });
  } else {
    const desc = await prisma.message.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: THREAD_PAGE + 1, select: MESSAGE_SELECT });
    hasOlder = desc.length > THREAD_PAGE;
    rows = desc.slice(0, THREAD_PAGE).reverse();
  }
  return { messages: rows.map((m) => toMessage(v, m)), readUpTo: await readUpTo(v, conversationId), hasOlder };
}

/** Saves a message from the caller's side and bumps the conversation to the top of both inboxes. */
export async function sendMessage(v: ChatViewer, conversationId: string, body: { text: string | null; image: string | null }): Promise<ChatMessage | null> {
  if (!(await owns(v, conversationId))) return null;
  const now = new Date();
  const [m] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderRole: v.side, senderId: v.userId, text: body.text, image: body.image, createdAt: now }, select: MESSAGE_SELECT }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
  ]);
  return toMessage(v, m);
}

/** Marks the other side's messages in this thread as read. Returns how many changed (null if not the caller's). */
export async function markRead(v: ChatViewer, conversationId: string): Promise<number | null> {
  if (!(await owns(v, conversationId))) return null;
  const r = await prisma.message.updateMany({ where: { conversationId, senderRole: otherSide(v), readAt: null }, data: { readAt: new Date() } });
  return r.count;
}
