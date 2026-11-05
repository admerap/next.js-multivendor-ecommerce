"use server";

import { z } from "zod";
import { CHAT_IMAGE_MAX_BYTES, CHAT_TEXT_MAX, type ChatConversation, type ChatMessage, type ThreadUpdate } from "@/lib/chat";
import { chatViewer, getConversation, getMessages, listConversations, markRead, sendMessage, unreadTotal, type Cursor } from "@/lib/chat.server";
import { deleteChatImage, saveChatImage, UploadError } from "@/lib/uploads";
import { chatId, threadQuerySchema } from "@/lib/validations/chat";

/**
 * Chat server actions (PRD FR-A10 / FR-V13), shared by the customer inbox and the vendor Chat Box. Each one
 * re-reads the session (chatViewer: a customer, or an approved vendor), validates its input with zod, and every
 * query underneath is scoped to the caller's own conversations — a foreign id behaves like a missing one.
 */

export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: string };

const SIGNED_OUT = "Your session has ended. Please sign in again.";
const NOT_FOUND = "This conversation isn't available.";
const fail = (error: string) => ({ ok: false as const, error });
const toCursor = (c?: { at: string; id: string }): Cursor | undefined => (c ? { at: new Date(c.at), id: c.id } : undefined);

/** getConversations(side): the caller's conversations, newest activity first, with unread counts. */
export async function getConversationsAction(): Promise<ChatResult<ChatConversation[]>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  try {
    return { ok: true, data: await listConversations(v) };
  } catch (error) {
    console.error("[chat] list failed", error instanceof Error ? error.name : error);
    return fail("We couldn't load your messages. Please try again.");
  }
}

export type OpenedThread = ThreadUpdate & { conversation: ChatConversation; hasOlder: boolean };

/** Opens a thread: its header + the latest page of messages. Marks the other side's messages read. */
export async function openConversationAction(input: unknown): Promise<ChatResult<OpenedThread>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  const id = chatId.safeParse(input);
  if (!id.success) return fail(NOT_FOUND);
  try {
    const conversation = await getConversation(v, id.data);
    if (!conversation) return fail(NOT_FOUND);
    await markRead(v, id.data);
    const page = await getMessages(v, id.data);
    if (!page) return fail(NOT_FOUND);
    return { ok: true, data: { ...page, conversation: { ...conversation, unread: 0 } } };
  } catch (error) {
    console.error("[chat] open failed", error instanceof Error ? error.name : error);
    return fail("We couldn't open this conversation. Please try again.");
  }
}

/** getMessages: what's new since `after` (polling), or the page before `before` ("Load earlier"). */
export async function getMessagesAction(input: unknown): Promise<ChatResult<ThreadUpdate & { hasOlder: boolean }>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  const q = threadQuerySchema.safeParse(input);
  if (!q.success) return fail(NOT_FOUND);
  try {
    const page = await getMessages(v, q.data.conversationId, { after: toCursor(q.data.after), before: toCursor(q.data.before) });
    return page ? { ok: true, data: page } : fail(NOT_FOUND);
  } catch (error) {
    console.error("[chat] messages failed", error instanceof Error ? error.name : error);
    return fail("We couldn't refresh this conversation.");
  }
}

const sendSchema = z
  .object({
    conversationId: chatId,
    text: z
      .string()
      .max(CHAT_TEXT_MAX, `Messages can be up to ${CHAT_TEXT_MAX.toLocaleString("en-US")} characters`)
      .transform((t) => t.trim() || null)
      .nullish(),
    image: z.instanceof(File).nullish(),
  })
  .refine((m) => !!m.text || (m.image && m.image.size > 0), { message: "Write a message or add a photo" });

/**
 * sendMessage: text and/or one image (multipart FormData: conversationId, text, image). The image is checked on
 * the server — real size and real type from its bytes (JPG / PNG / WebP) — and stored under a random name.
 * senderRole comes from the session, never from the form.
 */
export async function sendMessageAction(form: FormData): Promise<ChatResult<ChatMessage>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  const image = form.get("image");
  const parsed = sendSchema.safeParse({
    conversationId: form.get("conversationId"),
    text: form.get("text") ?? null,
    image: image instanceof File && image.size > 0 ? image : null,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Write a message or add a photo");
  const { conversationId, text } = parsed.data;

  let saved: string | null = null;
  try {
    if (parsed.data.image) {
      if (parsed.data.image.size > CHAT_IMAGE_MAX_BYTES) return fail(`Photos must be ${CHAT_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller`);
      saved = await saveChatImage(parsed.data.image, CHAT_IMAGE_MAX_BYTES);
    }
    const message = await sendMessage(v, conversationId, { text: text ?? null, image: saved });
    if (!message) {
      await deleteChatImage(saved);
      return fail(NOT_FOUND);
    }
    return { ok: true, data: message };
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message);
    await deleteChatImage(saved);
    console.error("[chat] send failed", error instanceof Error ? error.name : error);
    return fail("Your message wasn't sent. Please try again.");
  }
}

/** markRead: the other side's messages in this thread are now read (clears the unread badge). */
export async function markReadAction(input: unknown): Promise<ChatResult<{ marked: number }>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  const id = chatId.safeParse(input);
  if (!id.success) return fail(NOT_FOUND);
  const marked = await markRead(v, id.data);
  return marked === null ? fail(NOT_FOUND) : { ok: true, data: { marked } };
}

/** Unread messages across all of the caller's conversations (nav / sidebar badge). */
export async function unreadTotalAction(): Promise<ChatResult<number>> {
  const v = await chatViewer();
  if (!v) return fail(SIGNED_OUT);
  return { ok: true, data: await unreadTotal(v) };
}
