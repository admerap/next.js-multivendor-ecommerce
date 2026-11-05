import { MessagesSquare, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChatView } from "@/components/chat/ChatView";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import type { OpenedThread } from "@/lib/actions/chat";
import { requireArea } from "@/lib/auth-guard";
import { chatViewer, getConversation, getMessages, listConversations, markRead } from "@/lib/chat.server";
import { chatId } from "@/lib/validations/chat";

export const metadata: Metadata = { title: "Chat Box" };

/**
 * Seller Center › Chat Box (userchat design, store side — PRD FR-V13). The shared ChatView on the VENDOR side:
 * only this store's conversations (scoped by the session's vendorId inside lib/chat.server), and only those a
 * customer has written in. ?c=<id> opens one.
 */
export default async function VendorChatPage({ searchParams }: PageProps<"/vendor/chat">) {
  await requireArea("VENDOR");
  const viewer = await chatViewer();
  if (!viewer || viewer.side !== "VENDOR") throw new Error("Chat Box is for approved stores"); // requireArea already guarantees it
  const sp = await searchParams;

  let conversations = await listConversations(viewer);
  let opened: OpenedThread | null = null;
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

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Chat Box" }]} />
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
              <MessagesSquare aria-hidden className="size-5" strokeWidth={1.9} />
            </span>
            Chat Box
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-fg-muted">Questions from shoppers about your products. Quick, friendly replies turn browsers into buyers.</p>
        </div>
        <ChatView
          side="VENDOR"
          basePath="/vendor/chat"
          title="Customers"
          initialConversations={conversations}
          initialThread={opened}
          className="h-[calc(100dvh-13rem)] min-h-[28rem] md:min-h-[32rem] xl:max-h-[52rem]"
          emptyList={
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-iris-50 text-primary">
                <MessagesSquare aria-hidden className="size-7" strokeWidth={1.6} />
              </span>
              <p className="font-display text-base font-bold text-fg-strong">No customer messages yet</p>
              <p className="text-sm text-fg-muted">Shoppers can write to you from any of your product pages with Chat with Vendor. Their messages land here.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/vendor/products">
                  <Package aria-hidden />
                  View your products
                </Link>
              </Button>
            </div>
          }
        />
      </div>
    </>
  );
}
