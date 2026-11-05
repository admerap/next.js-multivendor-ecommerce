"use client";

import { AlertTriangle, Loader2, MessagesSquare, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { getConversationsAction, getMessagesAction, markReadAction, openConversationAction, sendMessageAction, type OpenedThread } from "@/lib/actions/chat";
import { CHAT_UNREAD_EVENT, LIST_POLL_MS, THREAD_POLL_MS, type ChatConversation, type ChatSide } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { ConversationList } from "./ConversationList";
import { MessageThread, type UiMessage } from "./MessageThread";
import { useChatPolling } from "./useChatPolling";

type Thread = { conversation: ChatConversation; messages: UiMessage[]; readUpTo: string | null; hasOlder: boolean };
const fromOpened = (t: OpenedThread): Thread => ({ conversation: t.conversation, messages: t.messages, readUpTo: t.readUpTo, hasOlder: t.hasOlder });
/** The newest message the server has confirmed — the polling cursor. */
const lastSaved = (ms: UiMessage[]) => [...ms].reverse().find((m) => !m.status);

/**
 * The shared conversation UI (userchat design) — the customer inbox and the vendor Chat Box both render this,
 * with their `side`. List on the left, thread on the right (one at a time below 768px). Opening a thread puts
 * it in the URL (?c=…) without a server round-trip. New messages arrive through useChatPolling; sending is
 * optimistic (shown at once, then confirmed, or marked "Not sent" with Retry).
 */
export function ChatView({
  side,
  basePath,
  initialConversations,
  initialThread,
  title,
  emptyList,
  className,
}: {
  side: ChatSide;
  basePath: string;
  initialConversations: ChatConversation[];
  initialThread: OpenedThread | null;
  title: string;
  emptyList: ReactNode;
  className?: string;
}) {
  const [conversations, setConversations] = useState(() => mergeActive(initialConversations, initialThread?.conversation));
  const [activeId, setActiveId] = useState<string | null>(initialThread?.conversation.id ?? null);
  const [thread, setThread] = useState<Thread | null>(initialThread ? fromOpened(initialThread) : null);
  const [threadState, setThreadState] = useState<"ready" | "loading" | "error">("ready");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const pending = useRef(new Map<string, { text: string; file: File | null }>());
  const box = useRef<HTMLElement>(null);
  const activeRef = useRef(activeId);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);
  // Phones: the chat sits below the account card + menu — bring it up under the sticky header when a thread opens.
  useEffect(() => {
    if (activeId && window.matchMedia("(max-width: 767px)").matches) box.current?.scrollIntoView({ block: "start" });
  }, [activeId]);

  // A thread opened on the server (?c=…) was just marked read there: let unread badges catch up.
  useEffect(() => {
    if (initialThread) window.dispatchEvent(new Event(CHAT_UNREAD_EVENT));
  }, [initialThread]);

  const setUrl = (id: string | null) => window.history.replaceState(null, "", id ? `${basePath}?c=${id}` : basePath);

  const open = useCallback(async (id: string) => {
    setActiveId(id);
    setUrl(id);
    setThreadState("loading");
    const res = await openConversationAction(id);
    if (activeRef.current !== id) return; // another conversation was picked meanwhile
    if (!res.ok) {
      setThreadState("error");
      return;
    }
    setThread(fromOpened(res.data));
    setThreadState("ready");
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    window.dispatchEvent(new Event(CHAT_UNREAD_EVENT));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setUrl only reads basePath (a constant prop)
  }, []);

  // ── Polling: the open thread, and the list (unread badges, new conversations, order) ──
  const pollThread = useCallback(async () => {
    const t = thread;
    if (!t || threadState !== "ready") return;
    const last = lastSaved(t.messages);
    const res = await getMessagesAction({ conversationId: t.conversation.id, ...(last && { after: { at: last.createdAt, id: last.id } }) });
    if (!res.ok || activeRef.current !== t.conversation.id) return;
    const fresh = res.data.messages;
    setThread((cur) => {
      if (!cur || cur.conversation.id !== t.conversation.id) return cur;
      const known = new Set(cur.messages.map((m) => m.id));
      const add = fresh.filter((m) => !known.has(m.id));
      return add.length || res.data.readUpTo !== cur.readUpTo ? { ...cur, messages: [...cur.messages, ...add], readUpTo: res.data.readUpTo } : cur;
    });
    if (fresh.some((m) => !m.mine)) {
      await markReadAction(t.conversation.id);
      window.dispatchEvent(new Event(CHAT_UNREAD_EVENT));
    }
  }, [thread, threadState]);

  const pollList = useCallback(async () => {
    const res = await getConversationsAction();
    if (!res.ok) return;
    setConversations(mergeActive(res.data.map((c) => (c.id === activeRef.current ? { ...c, unread: 0 } : c)), thread?.conversation));
  }, [thread?.conversation]);

  useChatPolling(pollThread, THREAD_POLL_MS, !!thread && threadState === "ready");
  useChatPolling(pollList, LIST_POLL_MS);

  // ── Sending (optimistic) ──
  const deliver = useCallback(async (tempId: string, conversationId: string) => {
    const body = pending.current.get(tempId);
    if (!body) return;
    const form = new FormData();
    form.set("conversationId", conversationId);
    if (body.text) form.set("text", body.text);
    if (body.file) form.set("image", body.file);
    const res = await sendMessageAction(form);
    setThread((cur) => {
      if (!cur || cur.conversation.id !== conversationId) return cur;
      return {
        ...cur,
        messages: cur.messages.map((m) => {
          if (m.id !== tempId) return m;
          if (!res.ok) return { ...m, status: "failed" as const };
          if (m.localImage) URL.revokeObjectURL(m.localImage);
          return res.data;
        }),
      };
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    pending.current.delete(tempId);
    setConversations((cs) => {
      const me = cs.find((c) => c.id === conversationId);
      if (!me) return cs;
      const bumped = { ...me, lastMessageAt: res.data.createdAt, lastMessage: { text: res.data.text, hasImage: !!res.data.image, mine: true, createdAt: res.data.createdAt } };
      return [bumped, ...cs.filter((c) => c.id !== conversationId)];
    });
  }, []);

  const send = (m: { text: string; file: File | null }) => {
    if (!thread) return;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pending.current.set(tempId, m);
    const optimistic: UiMessage = {
      id: tempId,
      mine: true,
      text: m.text || null,
      image: null,
      localImage: m.file ? URL.createObjectURL(m.file) : undefined,
      createdAt: new Date().toISOString(),
      readAt: null,
      status: "sending",
    };
    setThread({ ...thread, messages: [...thread.messages, optimistic] });
    void deliver(tempId, thread.conversation.id);
  };

  const retry = (id: string) => {
    if (!thread) return;
    setThread({ ...thread, messages: thread.messages.map((m) => (m.id === id ? { ...m, status: "sending" } : m)) });
    void deliver(id, thread.conversation.id);
  };
  const discard = (id: string) => {
    pending.current.delete(id);
    setThread((cur) => (cur ? { ...cur, messages: cur.messages.filter((m) => m.id !== id) } : cur));
  };

  const loadOlder = async () => {
    const t = thread;
    const first = t?.messages.find((m) => !m.status);
    if (!t || !first) return;
    setLoadingOlder(true);
    const res = await getMessagesAction({ conversationId: t.conversation.id, before: { at: first.createdAt, id: first.id } });
    setLoadingOlder(false);
    if (!res.ok) return void toast.error(res.error);
    setThread((cur) => (cur && cur.conversation.id === t.conversation.id ? { ...cur, messages: [...res.data.messages, ...cur.messages], hasOlder: res.data.hasOlder } : cur));
  };

  const back = () => {
    setActiveId(null);
    setThread(null);
    setUrl(null);
  };

  return (
    <section
      ref={box}
      aria-label={title}
      // scroll-mt: clears the sticky storefront header when scrolled into view on phones
      className={cn("grid min-h-0 scroll-mt-38 overflow-hidden rounded-lg bg-card shadow-sm md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]", className)}
    >
      <div className={cn("min-h-0 border-line md:border-r", activeId ? "max-md:hidden" : "")}>
        <ConversationList conversations={conversations} activeId={activeId} onSelect={(id) => id !== activeId && void open(id)} title={title} empty={emptyList} />
      </div>
      <div className={cn("min-h-0 min-w-0", !activeId && "max-md:hidden")}>
        {threadState === "loading" ? (
          <div role="status" aria-label="Loading conversation" className="flex h-full items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 aria-hidden className="size-5 animate-spin text-primary" />
            Opening conversation…
          </div>
        ) : threadState === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle aria-hidden className="size-8 text-error-500" strokeWidth={1.7} />
            <p className="font-semibold text-fg-strong">Couldn&apos;t open this conversation</p>
            <p className="max-w-80 text-sm text-fg-muted">It may have been removed, or the connection dropped.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={back}>
                Back to list
              </Button>
              {activeId && (
                <Button onClick={() => void open(activeId)}>
                  <RotateCcw aria-hidden />
                  Retry
                </Button>
              )}
            </div>
          </div>
        ) : thread ? (
          <MessageThread
            key={thread.conversation.id}
            conversation={thread.conversation}
            messages={thread.messages}
            readUpTo={thread.readUpTo}
            hasOlder={thread.hasOlder}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadOlder()}
            onSend={send}
            onRetry={retry}
            onDiscard={discard}
            onBack={back}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-iris-50 text-primary">
              <MessagesSquare aria-hidden className="size-8" strokeWidth={1.6} />
            </span>
            <p className="font-display text-lg font-bold text-fg-strong">{conversations.length ? "Pick a conversation" : "Your messages will appear here"}</p>
            <p className="max-w-80 text-sm text-fg-muted">
              {side === "CUSTOMER" ? "Chats with stores show up on the left — start one from any product page with Chat with Vendor." : "When a customer writes to your store, the conversation shows up on the left."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Keep the open conversation in the list even before its first message (a fresh chat from a product page). */
function mergeActive(list: ChatConversation[], active?: ChatConversation): ChatConversation[] {
  if (!active || list.some((c) => c.id === active.id)) return list;
  return [active, ...list];
}
