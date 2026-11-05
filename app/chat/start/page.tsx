import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findOrCreateConversation } from "@/lib/chat.server";
import { prisma } from "@/lib/db";
import { productHref, sellerHref } from "@/lib/storefront";
import { inboxHref, startChatSchema } from "@/lib/validations/chat";

/**
 * /chat/start?vendor=<vendorId>&product=<productId> — the product page's "Chat with Vendor" button. Renders
 * nothing: it decides and redirects.
 *  - Signed out → /login, then straight back here (callbackUrl), so the guest lands in the conversation.
 *  - Customer → findOrCreateConversation (one per customer + store) → their inbox with it open.
 *  - Vendor / admin → back to the page they came from with ?chat=customers-only (chat is for shoppers).
 *
 * A page (not a route handler) on purpose: after sign-in the login action redirect()s here with a client-side
 * navigation, and only a page redirect updates the browser URL to the inbox — a route handler's redirect would
 * leave the URL on /chat/start, where the inbox's server actions can't post. It only ever finds or creates the
 * caller's own empty thread with an approved store (idempotent); stores list only threads with messages.
 * Linked with a plain <a> (no prefetch).
 */
export default async function StartChatPage({ searchParams }: PageProps<"/chat/start">) {
  const sp = await searchParams;
  const parsed = startChatSchema.safeParse({ vendor: sp.vendor, product: sp.product });
  if (!parsed.success) redirect("/");
  const { vendor, product } = parsed.data;

  const user = (await auth())?.user;
  if (!user) {
    const back = `/chat/start?${new URLSearchParams({ vendor, ...(product && { product }) })}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  if (user.role !== "CUSTOMER") {
    // Send them back where the button was: the product page, else the store page.
    const [p, v] = await Promise.all([
      product ? prisma.product.findUnique({ where: { id: product }, select: { slug: true } }) : null,
      prisma.vendor.findUnique({ where: { id: vendor }, select: { slug: true } }),
    ]);
    redirect(`${p ? productHref(p.slug) : v ? sellerHref(v.slug) : "/"}?chat=customers-only`);
  }

  const res = await findOrCreateConversation(user.id, vendor, product);
  redirect(res.ok ? inboxHref(res.conversationId) : "/vendors?chat=store-unavailable");
}
