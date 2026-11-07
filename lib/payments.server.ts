import "server-only";

import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { CANCEL_GIVE_BACK, giveBackCanceled, rollUpPayment } from "@/lib/orders.server";
import { stripe } from "@/lib/stripe.server";

/**
 * Card payments (Stripe) for an order placed by lib/orders.server placeOrder.
 *
 * Flow: placeOrder writes the order exactly like COD (stock and coupon reserved, every part PENDING, payment
 * UNPAID) → createOrderPayment opens a PaymentIntent for the order's SAVED total → the browser confirms the card
 * with Stripe.js → Stripe's webhook (verified signature) marks the order PAID. Nothing the browser says ever
 * marks an order paid.
 */

/** ISO country codes Stripe expects, for the countries the checkout ships to. */
const COUNTRY_CODE: Record<string, string> = { "United States": "US", Canada: "CA", "United Kingdom": "GB" };

export type OrderPayment = { paymentIntentId: string; clientSecret: string };

class ReleaseConflict extends Error {}

/**
 * Opens (or, on a retry, re-reads) the order's PaymentIntent. The amount is the order total stored by placeOrder
 * — recomputed on the server from live prices — never a number from the browser. The idempotency key makes a
 * repeated call return the same PaymentIntent instead of a second charge.
 */
export async function createOrderPayment(orderId: string): Promise<OrderPayment> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      stripePaymentIntentId: true,
      shipName: true,
      shipPhone: true,
      shipEmail: true,
      shipCountry: true,
      shipState: true,
      shipCity: true,
      shipZip: true,
      shipAddress: true,
      shipAddress2: true,
      customer: { select: { name: true, email: true } },
    },
  });
  if (order.paymentMethod !== "STRIPE" || order.paymentStatus !== "UNPAID") throw new Error("Order is not awaiting a card payment");

  const intent = await stripe().paymentIntents.create(
    {
      amount: order.total, // integer cents, from the database
      currency: "usd",
      description: `Sundry order #${order.orderNumber}`,
      receipt_email: order.shipEmail,
      // What the webhook reconciles on (the PaymentIntent id is stored on the order too).
      metadata: {
        orderId: order.id,
        orderNumber: String(order.orderNumber),
        customerId: order.customerId,
        customerEmail: order.customer.email,
        customerName: order.customer.name ?? order.shipName,
      },
      shipping: {
        name: order.shipName,
        phone: order.shipPhone,
        address: {
          line1: order.shipAddress,
          line2: order.shipAddress2 ?? undefined,
          city: order.shipCity,
          state: order.shipState ?? undefined,
          postal_code: order.shipZip,
          country: COUNTRY_CODE[order.shipCountry] ?? undefined,
        },
      },
    },
    { idempotencyKey: `order-${order.id}-payment` },
  );
  if (!intent.client_secret) throw new Error("Stripe returned no client secret");

  // Only the first PaymentIntent is ever attached (a retry gets the same one back from the idempotency key).
  await prisma.order.updateMany({ where: { id: order.id, stripePaymentIntentId: null }, data: { stripePaymentIntentId: intent.id } });
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
}

/**
 * An unpaid card order that won't be paid (the PaymentIntent couldn't be opened, was canceled, or expired):
 * every part still PENDING is canceled by the system and the stock and coupon uses it reserved are given back —
 * the same give-back a customer cancel does. Paid orders and parts a seller already moved on are never touched.
 * Returns false when there was nothing to release.
 */
export async function releaseUnpaidCardOrder(orderId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          paymentMethod: true,
          paymentStatus: true,
          storeOrders: { where: { status: "PENDING" }, select: { id: true, ...CANCEL_GIVE_BACK } },
        },
      });
      if (!order || order.paymentMethod !== "STRIPE" || order.paymentStatus !== "UNPAID" || order.storeOrders.length === 0) return false;
      const parts = order.storeOrders;
      // Conditional flip: if anything changed since the read (a webhook marked it paid…), give nothing back.
      const flipped = await tx.storeOrder.updateMany({
        where: { id: { in: parts.map((p) => p.id) }, status: "PENDING", paymentStatus: "UNPAID" },
        data: { status: "CANCELED" },
      });
      if (flipped.count !== parts.length) throw new ReleaseConflict();
      await tx.storeOrderStatusEvent.createMany({ data: parts.map((p) => ({ storeOrderId: p.id, status: "CANCELED" as const, actorRole: null })) });
      await giveBackCanceled(tx, parts);
      await rollUpPayment(tx, order.id);
      return true;
    });
  } catch (error) {
    if (error instanceof ReleaseConflict) return false; // rolled back: it was paid or moved on meanwhile
    console.error(
      "[payments] release failed",
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : error,
    );
    return false;
  }
}

const logError = (what: string, error: unknown) =>
  console.error(`[payments] ${what}`, error instanceof Error ? error.message.replace(/(sk|rk|pi|ch|re|whsec)_\w+/g, "$1_***") : error);

/** The order a PaymentIntent pays for: by the id stored at placement, else by its metadata. */
async function orderForIntent(intent: Pick<Stripe.PaymentIntent, "id" | "metadata">) {
  const select = { id: true, orderNumber: true, total: true, paymentMethod: true, stripePaymentIntentId: true } as const;
  const byId = await prisma.order.findUnique({ where: { stripePaymentIntentId: intent.id }, select });
  if (byId) return byId;
  const orderId = intent.metadata?.orderId;
  if (!orderId) return null;
  const byMeta = await prisma.order.findUnique({ where: { id: orderId }, select });
  // Metadata alone never re-points an order that already has another PaymentIntent.
  return byMeta && (byMeta.stripePaymentIntentId === null || byMeta.stripePaymentIntentId === intent.id) ? byMeta : null;
}

export type PaidResult = "paid" | "already-paid" | "unknown-order" | "amount-mismatch" | "not-card";

/**
 * payment_intent.succeeded — the ONLY way a card order becomes PAID (called from the verified webhook, or by the
 * sweep after re-reading the PaymentIntent from Stripe). Idempotent: parts already paid are left alone, so a
 * repeated event changes nothing. The amount Stripe received must equal the order total, or nothing is marked.
 * Parts canceled before the money arrived are marked paid and then refunded (refundCanceledCardParts).
 */
export async function markOrderPaid(intent: Pick<Stripe.PaymentIntent, "id" | "metadata" | "amount_received" | "currency" | "status">): Promise<PaidResult> {
  if (intent.status !== "succeeded") return "already-paid";
  const order = await orderForIntent(intent);
  if (!order) return "unknown-order";
  if (order.paymentMethod !== "STRIPE") return "not-card";
  if (intent.currency !== "usd" || intent.amount_received !== order.total) {
    logError(`amount mismatch on order #${order.orderNumber}`, `${intent.amount_received} ${intent.currency} vs ${order.total} usd`);
    return "amount-mismatch";
  }
  const changed = await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { id: order.id, stripePaymentIntentId: null }, data: { stripePaymentIntentId: intent.id } });
    const marked = await tx.storeOrder.updateMany({
      where: { orderId: order.id, paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID", paidAt: new Date() },
    });
    if (marked.count > 0) await rollUpPayment(tx, order.id);
    return marked.count;
  });
  await refundCanceledCardParts(order.id);
  return changed > 0 ? "paid" : "already-paid";
}

/**
 * Card money for parts that are canceled goes back to the customer: one partial refund per canceled, paid part
 * (its own total), keyed by the part so a retry never refunds twice. The part becomes REFUNDED; an order whose
 * parts are all canceled and refunded becomes REFUNDED. Safe to call any time — it only acts on CANCELED + PAID
 * card parts. A failed refund stays PAID + CANCELED and is retried on the next call (the sweep calls it).
 */
export async function refundCanceledCardParts(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
      stripePaymentIntentId: true,
      storeOrders: { select: { id: true, status: true, paymentStatus: true, total: true } },
    },
  });
  if (!order || order.paymentMethod !== "STRIPE" || !order.stripePaymentIntentId) return 0;
  let refunded = 0;
  for (const part of order.storeOrders.filter((s) => s.status === "CANCELED" && s.paymentStatus === "PAID")) {
    try {
      if (part.total > 0) {
        await stripe().refunds.create(
          {
            payment_intent: order.stripePaymentIntentId,
            amount: part.total,
            metadata: { orderId: order.id, orderNumber: String(order.orderNumber), storeOrderId: part.id },
          },
          { idempotencyKey: `refund-${part.id}` },
        );
      }
      await prisma.storeOrder.updateMany({ where: { id: part.id, paymentStatus: "PAID" }, data: { paymentStatus: "REFUNDED" } });
      refunded++;
    } catch (error) {
      logError(`refund failed for order #${order.orderNumber}`, error);
    }
  }
  if (refunded > 0) {
    await prisma.$transaction(async (tx) => {
      const parts = await tx.storeOrder.findMany({ where: { orderId: order.id }, select: { status: true, paymentStatus: true } });
      const allBack = parts.every((p) => p.status === "CANCELED" && p.paymentStatus !== "PAID");
      if (allBack && parts.some((p) => p.paymentStatus === "REFUNDED")) await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } });
      else await rollUpPayment(tx, order.id);
    });
  }
  return refunded;
}

/**
 * After a customer or seller cancels (part of) a card order: refund what was already paid for the canceled
 * parts, and — if nothing is left to pay for — close the open PaymentIntent so it can't be paid any more.
 */
export async function settleCanceledCardOrder(orderId: string): Promise<{ refunded: number }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentMethod: true, paymentStatus: true, stripePaymentIntentId: true, storeOrders: { select: { status: true } } },
  });
  if (!order || order.paymentMethod !== "STRIPE") return { refunded: 0 };
  const refunded = await refundCanceledCardParts(order.id);
  const nothingLive = order.storeOrders.every((s) => s.status === "CANCELED");
  if (nothingLive && order.paymentStatus === "UNPAID" && order.stripePaymentIntentId) {
    const closed = await closeIntent(order.stripePaymentIntentId);
    // Paid at the very moment it was canceled: record the payment — the canceled parts are then refunded.
    if (closed !== "closed" && closed.status === "succeeded") return { refunded: refunded + ((await markOrderPaid(closed)) === "paid" ? 1 : 0) };
  }
  return { refunded };
}

/**
 * Cancels a PaymentIntent that hasn't taken money. Returns the PaymentIntent's state when it can't be canceled
 * because it was paid / is being paid (the caller must then NOT release the order).
 */
async function closeIntent(id: string): Promise<"closed" | Stripe.PaymentIntent> {
  try {
    const intent = await stripe().paymentIntents.retrieve(id);
    if (intent.status === "canceled") return "closed";
    if (intent.status === "succeeded" || intent.status === "processing" || intent.status === "requires_capture") return intent;
    await stripe().paymentIntents.cancel(id, { cancellation_reason: "abandoned" });
    return "closed";
  } catch (error) {
    // Canceled meanwhile, or paid at this very moment — re-read to know which.
    const intent = await stripe()
      .paymentIntents.retrieve(id)
      .catch(() => null);
    if (intent && intent.status !== "canceled") return intent;
    if (!intent) logError("could not close PaymentIntent", error);
    return "closed";
  }
}

/**
 * Checkout retry: the shopper's earlier card order wasn't paid (declined card) and the cart has changed since, so a
 * new order is placed — the old one is closed first so its reserved stock is free. Only the customer's own unpaid
 * card order. "paid" if Stripe says it was in fact paid meanwhile (then no new order should be placed).
 */
export async function abandonCardOrder(orderNumber: number, customerId: string): Promise<"released" | "paid" | "none"> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId, paymentMethod: "STRIPE", paymentStatus: "UNPAID" },
    select: { id: true, stripePaymentIntentId: true },
  });
  if (!order) return "none";
  const closed = order.stripePaymentIntentId ? await closeIntent(order.stripePaymentIntentId) : "closed";
  if (closed !== "closed") return closed.status === "succeeded" && (await markOrderPaid(closed)) !== "unknown-order" ? "paid" : "none";
  return (await releaseUnpaidCardOrder(order.id)) ? "released" : "none";
}

/** How long an unpaid card order keeps its stock and coupon before it's released. */
export const CARD_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

/** Unpaid card orders a customer may have open at once — each holds stock, so this stops one shopper hoarding it. */
export const MAX_OPEN_CARD_ORDERS = 3;

/** The customer's card orders still waiting for payment (within the payment window, not canceled). */
export function openCardOrders(customerId: string): Promise<number> {
  return prisma.order.count({
    where: {
      customerId,
      paymentMethod: "STRIPE",
      paymentStatus: "UNPAID",
      createdAt: { gte: new Date(Date.now() - CARD_PAYMENT_WINDOW_MS) },
      storeOrders: { some: { status: "PENDING" } },
    },
  });
}
const SWEEP_EVERY_MS = 60 * 1000;
let lastSweep = 0;

/**
 * Releases card orders left unpaid for CARD_PAYMENT_WINDOW_MS (shopper closed the tab, card kept failing…):
 * their PaymentIntent is canceled at Stripe first — if Stripe says it was in fact paid, the order is marked paid
 * instead (a webhook that never arrived). Also retries refunds that failed earlier. Throttled to once a minute
 * per server; called in the background (after the response) from checkout and the order pages.
 * TODO(production): also run it from a scheduled job (e.g. a cron hitting a protected route).
 */
export async function sweepExpiredCardOrders({ force = false }: { force?: boolean } = {}): Promise<number> {
  if (!force && Date.now() - lastSweep < SWEEP_EVERY_MS) return 0;
  lastSweep = Date.now();
  let released = 0;
  try {
    const stale = await prisma.order.findMany({
      where: {
        paymentMethod: "STRIPE",
        paymentStatus: "UNPAID",
        createdAt: { lt: new Date(Date.now() - CARD_PAYMENT_WINDOW_MS) },
        storeOrders: { some: { status: "PENDING" } },
      },
      select: { id: true, stripePaymentIntentId: true },
      take: 25,
      orderBy: { createdAt: "asc" },
    });
    for (const o of stale) {
      const closed = o.stripePaymentIntentId ? await closeIntent(o.stripePaymentIntentId) : "closed";
      if (closed !== "closed") {
        if (closed.status === "succeeded") await markOrderPaid(closed);
        continue; // processing / authorized: the webhook decides
      }
      if (await releaseUnpaidCardOrder(o.id)) released++;
    }
    const owed = await prisma.order.findMany({
      where: { paymentMethod: "STRIPE", stripePaymentIntentId: { not: null }, storeOrders: { some: { status: "CANCELED", paymentStatus: "PAID" } } },
      select: { id: true },
      take: 25,
    });
    for (const o of owed) await refundCanceledCardParts(o.id);
  } catch (error) {
    logError("sweep failed", error);
  }
  return released;
}

/**
 * Verified Stripe webhook events (app/api/stripe/webhook). Every branch is idempotent — Stripe may deliver an event
 * more than once, or out of order.
 *  - payment_intent.succeeded       → the order is PAID (markOrderPaid)
 *  - payment_intent.payment_failed  → nothing changes: the order stays UNPAID and the shopper can try another card
 *                                     until the payment window ends
 *  - payment_intent.canceled        → the order is released (stock + coupon back)
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<string> {
  switch (event.type) {
    case "payment_intent.succeeded":
      return markOrderPaid(event.data.object);
    case "payment_intent.payment_failed": {
      const order = await orderForIntent(event.data.object);
      return order ? `failed (order #${order.orderNumber} stays unpaid)` : "unknown-order";
    }
    case "payment_intent.canceled": {
      const order = await orderForIntent(event.data.object);
      if (!order) return "unknown-order";
      return (await releaseUnpaidCardOrder(order.id)) ? "released" : "nothing-to-release";
    }
    default:
      return "ignored";
  }
}
