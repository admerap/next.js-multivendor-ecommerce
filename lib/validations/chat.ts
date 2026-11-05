import { z } from "zod";

/** Chat ids are cuids — anything else is rejected before it reaches the database. */
export const chatId = z.string().trim().regex(/^[a-z0-9]{1,40}$/i, "Invalid id");

/** /chat/start?vendor=<vendorId>&product=<productId>: the product page's "Chat with Vendor" button. */
export const startChatSchema = z.object({
  vendor: chatId,
  product: chatId.optional().catch(undefined),
});

export const startChatHref = (vendorId: string, productId?: string) =>
  `/chat/start?${new URLSearchParams({ vendor: vendorId, ...(productId && { product: productId }) })}`;

/** The customer inbox with one conversation open. */
export const inboxHref = (conversationId?: string) => (conversationId ? `/dashboard/inbox?c=${conversationId}` : "/dashboard/inbox");

/** A position in a thread from the client: the last (or first) message it has. */
export const cursorSchema = z.object({ at: z.iso.datetime(), id: chatId });

export const threadQuerySchema = z.object({
  conversationId: chatId,
  after: cursorSchema.optional(),
  before: cursorSchema.optional(),
});
