"use client";

import { ImageIcon, MessagesSquare, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { previewOf, shortTime, type ChatConversation } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "./ChatAvatar";

/**
 * Left pane of the conversation UI (userchat design): search, then one row per conversation — the other
 * party's avatar and name, the last message (or "Photo"), a short timestamp and an unread badge. The open
 * conversation is highlighted with the iris rail.
 */
export function ConversationList({
  conversations,
  activeId,
  onSelect,
  title,
  empty,
}: {
  conversations: ChatConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  title: string;
  empty: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? conversations.filter((c) => c.counterpart.name.toLowerCase().includes(s) || c.product?.name.toLowerCase().includes(s)) : conversations;
  }, [conversations, q]);
  const unread = conversations.reduce((n, c) => n + c.unread, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="font-display text-lg font-extrabold text-fg-strong">{title}</h2>
        {unread > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-bold text-on-primary tabular-nums">{unread} new</span>}
      </div>
      <div className="p-4 pb-3">
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-sunken px-3 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-100)]">
          <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {conversations.length === 0 ? (
          empty
        ) : shown.length === 0 ? (
          <p className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-fg-muted">
            <MessagesSquare aria-hidden className="size-7 text-fg-subtle" strokeWidth={1.6} />
            No conversation matches “{q.trim()}”.
          </p>
        ) : (
          <ul aria-label="Conversations">
            {shown.map((c) => {
              const on = c.id === activeId;
              const last = c.lastMessage;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-3 px-4 py-3.5 text-left transition-colors duration-(--dur-fast)",
                      on ? "border-primary bg-iris-50" : "border-transparent hover:bg-hover",
                    )}
                  >
                    <span className="relative">
                      <ChatAvatar name={c.counterpart.name} image={c.counterpart.image} />
                      {c.unread > 0 && !on && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-sm text-fg-strong", c.unread > 0 ? "font-extrabold" : "font-bold")}>{c.counterpart.name}</span>
                        <span className={cn("shrink-0 text-[0.7rem] tabular-nums", c.unread > 0 ? "font-bold text-primary" : "text-fg-subtle")} suppressHydrationWarning>
                          {shortTime(last?.createdAt ?? c.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={cn("flex min-w-0 flex-1 items-center gap-1 truncate text-caption", c.unread > 0 ? "font-semibold text-fg-strong" : "text-fg-muted")}>
                          {last?.hasImage && !last.text && <ImageIcon aria-hidden className="size-3.5 shrink-0" />}
                          <span className="truncate">{previewOf(last)}</span>
                        </span>
                        {c.unread > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[0.68rem] font-bold text-on-primary tabular-nums">
                            {c.unread > 99 ? "99+" : c.unread}
                            <span className="sr-only"> unread</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
