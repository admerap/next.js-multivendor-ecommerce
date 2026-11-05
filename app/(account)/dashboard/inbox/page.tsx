import { Bot, Clock3, MessagesSquare, Store, Truck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChatView } from "@/components/chat/ChatView";
import { Button } from "@/components/ui/button";
import type { OpenedThread } from "@/lib/actions/chat";
import { requireArea } from "@/lib/auth-guard";
import { chatViewer, getConversation, getMessages, listConversations, markRead } from "@/lib/chat.server";
import { cn } from "@/lib/utils";
import { chatId } from "@/lib/validations/chat";

export const metadata: Metadata = { title: "Inbox" };

const TABS: { key: "sellers" | "support" | "deliveryman"; label: string; icon: LucideIcon }[] = [
  { key: "sellers", label: "Sellers", icon: Store },
  { key: "support", label: "Support", icon: Bot },
  { key: "deliveryman", label: "Deliveryman", icon: Truck },
];

/**
 * Inbox (userchat design, PRD FR-A7 / FR-A10). Sellers = the customer's chats with stores — the shared ChatView
 * on the CUSTOMER side; ?c=<id> opens one (the product page's "Chat with Vendor" lands here). Support (Sundry AI
 * Support) and Deliveryman aren't built yet: they say so instead of showing a made-up conversation.
 */
export default async function InboxPage({ searchParams }: PageProps<"/dashboard/inbox">) {
  await requireArea("CUSTOMER");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "sellers";
  const viewer = await chatViewer();
  if (!viewer) throw new Error("Chat is only for customer accounts"); // requireArea already guarantees it

  let conversations = null;
  let opened: OpenedThread | null = null;
  if (tab === "sellers") {
    conversations = await listConversations(viewer);
    const id = chatId.safeParse(typeof sp.c === "string" ? sp.c : undefined);
    if (id.success) {
      const conversation = await getConversation(viewer, id.data);
      if (conversation) {
        await markRead(viewer, id.data);
        const page = await getMessages(viewer, id.data);
        if (page) {
          opened = { ...page, conversation: { ...conversation, unread: 0 } };
          conversations = conversations.map((c) => (c.id === id.data ? { ...c, unread: 0 } : c));
        }
      }
    }
  }
  const sellersUnread = conversations?.reduce((n, c) => n + c.unread, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 font-display text-[clamp(1.4rem,2.6vw,1.6rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <span className="grid size-10 place-items-center rounded-md bg-iris-50 text-primary">
            <MessagesSquare aria-hidden className="size-5" strokeWidth={1.9} />
          </span>
          Inbox
        </h1>
        <nav aria-label="Inbox sections" className="flex gap-1 rounded-full bg-card p-1 shadow-xs">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Link
                key={t.key}
                href={t.key === "sellers" ? "/dashboard/inbox" : `/dashboard/inbox?tab=${t.key}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-(--dur-fast) max-sm:min-h-11 max-sm:px-3",
                  on ? "bg-primary !text-on-primary shadow-primary" : "!text-fg-muted hover:!text-primary",
                )}
              >
                <t.icon aria-hidden className="size-4" strokeWidth={2} />
                {t.label}
                {t.key === "sellers" && sellersUnread > 0 && !on && <span className="size-2 rounded-full bg-primary" aria-label={`${sellersUnread} unread`} />}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === "sellers" ? (
        <ChatView
          side="CUSTOMER"
          basePath="/dashboard/inbox"
          title="Sellers"
          initialConversations={conversations!}
          initialThread={opened}
          className="h-[calc(100dvh-10rem)] min-h-[26rem] md:h-[calc(100dvh-12rem)] md:max-h-[46rem] md:min-h-[32rem]"
          emptyList={
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-iris-50 text-primary">
                <MessagesSquare aria-hidden className="size-7" strokeWidth={1.6} />
              </span>
              <p className="font-display text-base font-bold text-fg-strong">No messages yet</p>
              <p className="text-sm text-fg-muted">Questions about a product? Open it and tap Chat with Vendor — the conversation shows up here.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/vendors">
                  <Store aria-hidden />
                  Browse stores
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <section className="flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-lg bg-card px-6 py-14 text-center shadow-sm">
          <span className="grid size-16 place-items-center rounded-full bg-sunken text-fg-muted">
            {tab === "support" ? <Bot aria-hidden className="size-8" strokeWidth={1.6} /> : <Truck aria-hidden className="size-8" strokeWidth={1.6} />}
          </span>
          <p className="flex items-center gap-2 font-display text-lg font-bold text-fg-strong">
            {tab === "support" ? "Sundry AI Support" : "Chat with your courier"}
            <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-0.5 font-sans text-caption font-bold text-fg-muted">
              <Clock3 aria-hidden className="size-3" />
              Coming soon
            </span>
          </p>
          <p className="max-w-md text-sm text-fg-muted">
            {tab === "support"
              ? "An assistant that answers questions about your orders, shipping and returns is on the way. Until then, open a support ticket and our team will reply."
              : "When couriers are on Sundry, you'll be able to message the one bringing your order here."}
          </p>
          {tab === "support" && (
            <Button asChild variant="secondary">
              <Link href="/dashboard/support">
                <Bot aria-hidden />
                Go to Support Ticket
              </Link>
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
