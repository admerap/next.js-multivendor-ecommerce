"use client";

import { AlertCircle, ArrowDown, ArrowLeft, CheckCheck, Clock3, ExternalLink, Loader2, MessageCircleHeart, RotateCcw, Store, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { clockTime, dayLabel, type ChatConversation, type ChatMessage } from "@/lib/chat";
import { productHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "./ChatAvatar";
import { Composer } from "./Composer";

/** A message as the UI holds it: saved, or still sending / failed (optimistic, with a local photo preview). */
export type UiMessage = ChatMessage & { status?: "sending" | "failed"; localImage?: string };

/** Messages from the same side within this gap share one bubble group (one timestamp under the last). */
const GROUP_MS = 5 * 60_000;

/**
 * Right pane of the conversation UI (userchat design): header (other party + where the chat started), the
 * thread with day separators and grouped bubbles — mine on the right in iris, theirs on the left — and the
 * composer. Sticks to the bottom as messages arrive unless you've scrolled up to read (then a "New messages"
 * button appears). Photos open full size.
 */
export function MessageThread({
  conversation,
  messages,
  readUpTo,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onSend,
  onRetry,
  onDiscard,
  onBack,
}: {
  conversation: ChatConversation;
  messages: UiMessage[];
  readUpTo: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onSend: (m: { text: string; file: File | null }) => void;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onBack: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const firstId = messages[0]?.id;
  const lastId = messages.at(-1)?.id;
  const prevFirst = useRef(firstId);
  const prevHeight = useRef(0);

  // Open at the bottom; on new messages stay at the bottom if we were there, else offer a jump.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevFirst.current !== firstId && prevHeight.current && messages.length) {
      // Older page prepended: keep the reader's place.
      el.scrollTop += el.scrollHeight - prevHeight.current;
    } else if (atBottom.current || messages.at(-1)?.mine) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    } else {
      setShowJump(true);
    }
    prevFirst.current = firstId;
    prevHeight.current = el.scrollHeight;
  }, [firstId, lastId, messages]);

  // A new conversation always opens at its latest message.
  useEffect(() => {
    atBottom.current = true;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.id]);

  const onScroll = () => {
    const el = scroller.current!;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current) setShowJump(false);
    prevHeight.current = el.scrollHeight;
  };
  const jump = () => {
    const el = scroller.current!;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const c = conversation.counterpart;
  const lastSeenMine = readUpTo ? [...messages].reverse().find((m) => m.mine && !m.status && m.createdAt <= readUpTo)?.id : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <button type="button" onClick={onBack} aria-label="Back to conversations" className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-hover md:hidden">
          <ArrowLeft aria-hidden className="size-5" />
        </button>
        <ChatAvatar name={c.name} image={c.image} size={42} />
        <div className="min-w-0 flex-1">
          {c.href ? (
            <Link href={c.href} className="block truncate text-[0.95rem] font-bold !text-fg-strong hover:!text-primary">
              {c.name}
            </Link>
          ) : (
            <p className="truncate text-[0.95rem] font-bold text-fg-strong">{c.name}</p>
          )}
          <p className="flex items-center gap-1.5 truncate text-caption text-fg-muted">
            {c.href && <Store aria-hidden className="size-3.5 shrink-0 text-primary" />}
            {c.subtitle}
          </p>
        </div>
        {c.href && (
          <Link href={c.href} className="hidden min-h-11 items-center gap-1.5 rounded-md border border-line px-3 text-caption font-semibold !text-fg hover:border-primary hover:!text-primary sm:inline-flex">
            <ExternalLink aria-hidden className="size-3.5" />
            Visit store
          </Link>
        )}
      </div>

      {/* Product the chat started from */}
      {conversation.product && (
        <Link
          href={productHref(conversation.product.slug)}
          className="flex items-center gap-3 border-b border-line bg-sunken/60 px-4 py-2.5 !text-fg transition-colors hover:bg-iris-50 sm:px-5"
        >
          <span className="relative size-10 shrink-0 overflow-hidden rounded-md border border-line bg-card">
            {conversation.product.image && <Image src={conversation.product.image} alt="" fill sizes="40px" className="object-cover" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.68rem] font-bold tracking-[0.06em] text-fg-subtle uppercase">About this product</span>
            <span className="block truncate text-sm font-semibold text-fg-strong">{conversation.product.name}</span>
          </span>
          <ExternalLink aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        </Link>
      )}

      {/* Thread */}
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-5 sm:px-5" aria-live="polite" aria-relevant="additions">
          {hasOlder && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={onLoadOlder}
                disabled={loadingOlder}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-caption font-semibold text-fg-muted hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {loadingOlder ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Clock3 aria-hidden className="size-3.5" />}
                Load earlier messages
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-iris-50 text-primary">
                <MessageCircleHeart aria-hidden className="size-8" strokeWidth={1.6} />
              </span>
              <p className="font-display text-lg font-bold text-fg-strong">Say hello to {c.name}</p>
              <p className="max-w-80 text-sm text-fg-muted">
                {c.href ? "Ask about sizes, materials, delivery or anything else — the store usually replies within a day." : "Your reply will appear here."}
              </p>
            </div>
          ) : (
            <ol className="flex flex-col">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                const joinsPrev = !newDay && prev && prev.mine === m.mine && +new Date(m.createdAt) - +new Date(prev.createdAt) < GROUP_MS;
                const endsGroup = !next || next.mine !== m.mine || +new Date(next.createdAt) - +new Date(m.createdAt) >= GROUP_MS || dayLabel(next.createdAt) !== dayLabel(m.createdAt);
                const photo = m.localImage ?? m.image;
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <li className="my-3 flex justify-center first:mt-0" aria-hidden={false}>
                        <span className="rounded-full bg-sunken px-3 py-1 text-[0.7rem] font-semibold text-fg-subtle" suppressHydrationWarning>
                          {dayLabel(m.createdAt)}
                        </span>
                      </li>
                    )}
                    <li className={cn("flex flex-col", m.mine ? "items-end" : "items-start", joinsPrev ? "mt-1" : "mt-3")}>
                      <div
                        className={cn(
                          "max-w-[min(78%,30rem)] overflow-hidden text-sm leading-relaxed shadow-xs",
                          m.mine ? "bg-primary text-on-primary" : "bg-sunken text-fg-strong",
                          m.mine ? (joinsPrev ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-sm") : joinsPrev ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-sm",
                          m.status === "sending" && "opacity-70",
                          m.status === "failed" && "ring-2 ring-error-500",
                        )}
                      >
                        {photo && (
                          <button type="button" onClick={() => setViewing(photo)} className="block w-full" aria-label="Open photo">
                            {m.localImage ? (
                              // eslint-disable-next-line @next/next/no-img-element -- local blob preview while sending
                              <img src={m.localImage} alt="Photo" className="max-h-72 w-full object-cover" />
                            ) : (
                              <Image src={m.image!} alt="Photo" width={480} height={360} sizes="(max-width: 640px) 75vw, 30rem" className="max-h-72 w-full object-cover" />
                            )}
                          </button>
                        )}
                        {m.text && <p className={cn("px-4 py-2.5 break-words whitespace-pre-wrap", photo && "pt-2")}>{m.text}</p>}
                      </div>
                      {m.status === "failed" ? (
                        <p className="mt-1 flex items-center gap-2 text-[0.7rem] font-semibold text-error-600">
                          <AlertCircle aria-hidden className="size-3.5" />
                          Not sent
                          <button type="button" onClick={() => onRetry(m.id)} className="inline-flex min-h-8 items-center gap-1 rounded px-1 hover:underline">
                            <RotateCcw aria-hidden className="size-3" />
                            Retry
                          </button>
                          <button type="button" onClick={() => onDiscard(m.id)} className="inline-flex min-h-8 items-center gap-1 rounded px-1 text-fg-muted hover:underline">
                            <Trash2 aria-hidden className="size-3" />
                            Discard
                          </button>
                        </p>
                      ) : m.status === "sending" ? (
                        <p className="mt-1 flex items-center gap-1 text-[0.7rem] text-fg-subtle">
                          <Loader2 aria-hidden className="size-3 animate-spin" />
                          Sending…
                        </p>
                      ) : (
                        (endsGroup || m.id === lastSeenMine) && (
                          <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-fg-subtle tabular-nums" suppressHydrationWarning>
                            {clockTime(m.createdAt)}
                            {m.id === lastSeenMine && (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                                <CheckCheck aria-hidden className="size-3.5" />
                                Seen
                              </span>
                            )}
                          </p>
                        )
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          )}
        </div>
        {showJump && (
          <button
            type="button"
            onClick={jump}
            className="absolute bottom-3 left-1/2 inline-flex min-h-10 -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 text-caption font-bold text-on-primary shadow-lg"
          >
            <ArrowDown aria-hidden className="size-3.5" />
            New messages
          </button>
        )}
      </div>

      <Composer onSend={onSend} placeholder="Write your message…" />

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:w-[min(900px,calc(100vw-32px))]">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {viewing && (
            // eslint-disable-next-line @next/next/no-img-element -- full-size view of an uploaded / local photo
            <img src={viewing} alt="Photo" className="mx-auto max-h-[78dvh] w-auto rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
