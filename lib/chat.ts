/**
 * Customer ↔ store chat — shapes and pure helpers shared by the server and the conversation UI (client-safe).
 * Queries live in lib/chat.server.ts, actions in lib/actions/chat.ts.
 */

export type ChatSide = "CUSTOMER" | "VENDOR";

/** Composer limits (checked again on the server). */
export const CHAT_TEXT_MAX = 2000;
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** How often an open thread / the conversation list ask for news (ms). See useChatPolling. */
export const THREAD_POLL_MS = 3500;
/** Window event the chat fires after it marks messages read, so unread badges elsewhere refresh at once. */
export const CHAT_UNREAD_EVENT = "sundry:chat-read";
export const LIST_POLL_MS = 10_000;

/** The other party, as one side sees them. */
export type ChatCounterpart = {
  name: string;
  image: string | null;
  /** customer side: link to the store page · vendor side: none (customers have no public page) */
  href: string | null;
  /** "Verified seller" / "Customer since Oct 2026" */
  subtitle: string;
};

export type ChatConversation = {
  id: string;
  counterpart: ChatCounterpart;
  /** the product page the chat was started from, if any */
  product: { name: string; slug: string; image: string | null } | null;
  lastMessage: { text: string | null; hasImage: boolean; mine: boolean; createdAt: string } | null;
  lastMessageAt: string;
  /** messages from the other side not read yet */
  unread: number;
};

export type ChatMessage = {
  id: string;
  mine: boolean;
  text: string | null;
  image: string | null;
  createdAt: string;
  /** for my own messages: when the other side read it */
  readAt: string | null;
};

/** One poll's answer for an open thread: new messages after the cursor + how far the other side has read mine. */
export type ThreadUpdate = { messages: ChatMessage[]; readUpTo: string | null };

/** Conversation list preview line. */
export function previewOf(m: ChatConversation["lastMessage"]): string {
  if (!m) return "No messages yet — say hello";
  const body = m.text?.trim() ? m.text.trim() : m.hasImage ? "Photo" : "";
  return `${m.mine ? "You: " : ""}${body}`;
}

/** "now" · "5m" · "3h" · "Yesterday" · "Mon" · "Oct 12" · "Oct 12, 2025" — list timestamps. */
export function shortTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const s = (now.getTime() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return `${Math.floor(s / 3600)}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}

/** "Today" · "Yesterday" · "Monday, Oct 12" — the separators between days in a thread. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}

export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w)) // "Willow & Oak" → WO, not W&
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
