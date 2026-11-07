import "server-only";

import { Prisma, type PaymentMethod } from "@prisma/client";
import type { CartLineInput, CartQuote, ShippingMethod } from "@/lib/checkout";
import { quoteCart } from "@/lib/checkout.server";
import { prisma } from "@/lib/db";
import { VISIBLE } from "@/lib/storefront.server";
import {
  canceledPartsTotal,
  canCustomerCancel,
  canCustomerCancelPart,
  CUSTOMER_CANCELABLE,
  customerOrderStatus,
  ORDER_STATUSES,
  orderProgressNote,
  statusFromSlug,
  type OrderStatusKey,
} from "@/lib/orders";
import { CUSTOMER_ORDERS_PAGE_SIZE, type CustomerOrderListParams } from "@/lib/validations/customer-orders";
import type { CheckoutAddresses } from "@/lib/validations/checkout";

/**
 * Order placement — the server is the only authority. The browser says what to buy, where to ship and
 * which store coupons to try; prices, stock, shipping, tax and discounts are recomputed here from live
 * data (the same quote engine the cart shows), and everything is written in ONE transaction:
 *   stock (conditional decrement — never oversells) → coupon usage (respecting usageLimit) →
 *   Order + one StoreOrder per store + OrderItem snapshots.
 * Any failure rolls the whole thing back: no partial order, no lost stock.
 */

/** Platform commission on each store's item subtotal after its coupon — PRD default 10% (basis points). */
export const DEFAULT_COMMISSION_BP = 1000;
const FIRST_ORDER_NUMBER = 100_001;

export type PlaceOrderInput = {
  customerId: string;
  lines: CartLineInput[];
  /** vendorId → coupon code the shopper applied */
  coupons: Record<string, string>;
  addresses: CheckoutAddresses;
  note: string | null;
  /** delivery speed for the whole order (Standard when omitted) */
  shippingMethod?: ShippingMethod;
  paymentMethod: PaymentMethod;
  /** the grand total (cents) the shopper saw when pressing Place Order */
  expectedTotal: number;
};

export type PlaceOrderError = { code: "CART_CHANGED" | "OUT_OF_STOCK" | "COUPON" | "EMPTY"; message: string };
export type PlaceOrderResult = { ok: true; orderId: string; orderNumber: number; total: number } | ({ ok: false } & PlaceOrderError);

class Abort extends Error {
  constructor(readonly detail: PlaceOrderError) {
    super(detail.message);
  }
}

/** Why the quote can't be ordered as the shopper saw it (null = it can). */
function quoteProblem(quote: CartQuote, input: PlaceOrderInput): PlaceOrderError | null {
  const lines = quote.stores.flatMap((s) => s.lines);
  const gone = lines.find((l) => !l.available);
  if (gone) {
    // A product that left the storefront can't be read any more, so it has no real name to show.
    const what = gone.issue === "unavailable" ? "An item in your cart" : gone.variationName ? `${gone.name} (${gone.variationName})` : gone.name;
    return { code: "OUT_OF_STOCK", message: `${what} is no longer available. Review your cart to continue.` };
  }
  if (quote.itemCount === 0) return { code: "EMPTY", message: "Your cart is empty." };
  const adjusted = lines.find((l) => l.issue === "qty-capped" || l.issue === "qty-min");
  if (adjusted) return { code: "CART_CHANGED", message: `${adjusted.name}: ${adjusted.message} Review your order before placing it.` };
  const badCoupon = quote.stores.find((s) => s.couponError);
  if (badCoupon?.couponError) return { code: "COUPON", message: `Coupon ${badCoupon.couponError.code}: ${badCoupon.couponError.message} Remove it to continue.` };
  // An applied code for a store no longer in the cart is simply ignored (nothing to discount).
  if (quote.total !== input.expectedTotal) return { code: "CART_CHANGED", message: "Prices or availability changed while you were checking out. Review the updated total and place your order again." };
  return null;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const ship = input.addresses.shipping;
  const quote = await quoteCart(input.lines, { coupons: input.coupons, userId: input.customerId, shippingMethod: input.shippingMethod, shipTo: { country: ship.country, state: ship.state ?? "" } });
  const problem = quoteProblem(quote, input);
  if (problem) return { ok: false, ...problem };

  const { shipping, billingSame, billing } = input.addresses;
  const stores = quote.stores.filter((s) => s.lines.some((l) => l.available));

  // Payment seam: every order starts UNPAID with its stock and coupons reserved. COD is paid on delivery;
  // STRIPE gets its PaymentIntent from lib/payments.server once this order exists, and only Stripe's
  // verified webhook marks it PAID.
  const paymentStatus = "UNPAID" as const;

  for (let attempt = 0; ; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        // 1) Stock — conditional decrements: if anyone bought the last units since the quote, abort.
        for (const l of stores.flatMap((s) => s.lines)) {
          if (l.digital) continue;
          if (l.variationId) {
            const v = await tx.productVariation.updateMany({ where: { id: l.variationId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
            if (v.count !== 1) throw new Abort({ code: "OUT_OF_STOCK", message: `${l.name} (${l.variationName}) just sold out. Review your cart to continue.` });
            // Product.stock is the total of its variations — keep it in sync.
            await tx.product.update({ where: { id: l.productId }, data: { stock: { decrement: l.qty } } });
          } else {
            const p = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
            if (p.count !== 1) throw new Abort({ code: "OUT_OF_STOCK", message: `Only a few of ${l.name} were left and they just sold out. Review your cart to continue.` });
          }
        }

        // 2) Coupons — count the redemption, never past the coupon's usage limit.
        for (const s of stores) {
          if (!s.coupon) continue;
          const used = await tx.coupon.updateMany({
            where: { id: s.coupon.couponId, OR: [{ usageLimit: null }, { usedCount: { lt: prisma.coupon.fields.usageLimit } }] },
            data: { usedCount: { increment: 1 } },
          });
          if (used.count !== 1) throw new Abort({ code: "COUPON", message: `Coupon ${s.coupon.code} has just been fully redeemed. Remove it to continue.` });
        }

        // 3) The order: one parent, one StoreOrder per store, item snapshots.
        const last = await tx.order.aggregate({ _max: { orderNumber: true } });
        const orderNumber = Math.max(FIRST_ORDER_NUMBER, (last._max.orderNumber ?? 0) + 1);
        return tx.order.create({
          data: {
            orderNumber,
            customerId: input.customerId,
            paymentMethod: input.paymentMethod,
            paymentStatus,
            shippingMethod: quote.shippingMethod,
            taxRate: quote.taxRegion?.rate ?? 0,
            taxRegion: quote.taxRegion?.region ?? null,
            shipName: shipping.name,
            shipPhone: shipping.phone,
            shipEmail: shipping.email,
            shipAddressType: shipping.type,
            shipCountry: shipping.country,
            shipState: shipping.state || null,
            shipCity: shipping.city,
            shipZip: shipping.zip,
            shipAddress: shipping.address,
            shipAddress2: shipping.address2 || null,
            billingSameAsShipping: billingSame,
            ...(!billingSame && billing
              ? {
                  billName: billing.name,
                  billPhone: billing.phone,
                  billEmail: billing.email,
                  billAddressType: billing.type,
                  billCountry: billing.country,
                  billState: billing.state || null,
                  billCity: billing.city,
                  billZip: billing.zip,
                  billAddress: billing.address,
                  billAddress2: billing.address2 || null,
                }
              : {}),
            note: input.note,
            subtotal: quote.subtotal,
            discount: quote.discount,
            shipping: quote.shipping,
            tax: quote.tax,
            total: quote.total,
            storeOrders: {
              create: stores.map((s) => ({
                vendorId: s.vendor.id,
                subtotal: s.subtotal,
                discount: s.discount,
                shipping: s.shipping,
                tax: s.tax,
                total: s.total,
                commissionRate: DEFAULT_COMMISSION_BP,
                commission: Math.round(((s.subtotal - s.discount) * DEFAULT_COMMISSION_BP) / 10_000),
                couponId: s.coupon?.couponId ?? null,
                couponCode: s.coupon?.code ?? null,
                events: { create: { status: "PENDING", actorRole: "CUSTOMER", actorId: input.customerId } },
                items: {
                  create: s.lines
                    .filter((l) => l.available)
                    .map((l) => ({
                      productId: l.productId,
                      variationId: l.variationId,
                      productName: l.name,
                      productSlug: l.slug,
                      sku: l.sku,
                      variationName: l.variationName,
                      image: l.image,
                      unitPrice: l.unitPrice,
                      qty: l.qty,
                      discount: l.discount,
                      tax: l.tax,
                      lineTotal: l.total,
                    })),
                },
              })),
            },
          },
          select: { id: true, orderNumber: true, total: true },
        });
      });
      return { ok: true, orderId: order.id, orderNumber: order.orderNumber, total: order.total };
    } catch (error) {
      if (error instanceof Abort) return { ok: false, ...error.detail };
      // Two orders took the same number at once → the unique index refused one; take the next number.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }
}

// ── Reading an order back (confirmation page, invoice) ──

export const ORDER_VIEW = {
  storeOrders: {
    orderBy: { createdAt: "asc" },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true, logo: true, storeAddress: true, status: true } },
      items: { orderBy: { productName: "asc" } },
      events: { orderBy: { createdAt: "asc" }, select: { status: true, actorRole: true, createdAt: true } },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderView = Prisma.OrderGetPayload<{ include: typeof ORDER_VIEW }>;

/**
 * One of THIS customer's orders by its number, with its store orders and items (snapshots). Another
 * customer's number → null, the same answer as an unknown one, so order numbers can't be probed.
 */
export async function getCustomerOrder(orderNumber: number, customerId: string): Promise<OrderView | null> {
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1) return null;
  return prisma.order.findFirst({ where: { orderNumber, customerId }, include: ORDER_VIEW });
}

// ── Customer › My Order ─────────────────────────────────────────────────────────────────────────

export type CustomerOrderRow = {
  orderNumber: number;
  createdAt: Date;
  total: number;
  status: OrderStatusKey;
  paymentMethod: PaymentMethod;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  /** units across every seller */
  itemCount: number;
  sellers: string[];
  /** first item images (cards show a small strip) */
  images: string[];
  canCancel: boolean;
  /** "2 of 3 delivered" when sellers are at different steps */
  progressNote: string | null;
};

export type CustomerOrderList = {
  rows: CustomerOrderRow[];
  /** per status, for the filter pills (hidden orders excluded) */
  counts: Record<OrderStatusKey, number>;
  all: number;
  /** after search + status filter */
  total: number;
  page: number;
  pageCount: number;
};

/**
 * THIS customer's orders (never anyone else's), minus the ones they hid. A customer has few orders,
 * so the status of each (derived from its seller parts) is computed here and the search, status filter
 * and pagination run on that — the counts on the pills always match what the filter shows.
 */
export async function listCustomerOrders(customerId: string, params: CustomerOrderListParams): Promise<CustomerOrderList> {
  const orders = await prisma.order.findMany({
    where: { customerId, hiddenByCustomerAt: null },
    orderBy: { createdAt: params.sort === "oldest" ? "asc" : "desc" },
    take: 1000,
    select: {
      orderNumber: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      storeOrders: {
        orderBy: { createdAt: "asc" },
        select: { status: true, total: true, vendor: { select: { storeName: true } }, items: { select: { qty: true, image: true, productName: true } } },
      },
    },
  });

  /** product names per order, for the search box */
  const names = new Map<number, string>();
  const rows: CustomerOrderRow[] = orders.map((o) => {
    const statuses = o.storeOrders.map((s) => s.status);
    const items = o.storeOrders.flatMap((s) => s.items);
    names.set(o.orderNumber, items.map((i) => i.productName).join(" ").toLowerCase());
    return {
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      total: o.total - canceledPartsTotal(o.storeOrders), // what's still due when some sellers were canceled
      status: customerOrderStatus(statuses),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      sellers: o.storeOrders.map((s) => s.vendor.storeName),
      images: items.flatMap((i) => (i.image ? [i.image] : [])).slice(0, 4),
      canCancel: canCustomerCancel(statuses),
      progressNote: orderProgressNote(statuses),
    };
  });

  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatusKey, number>;
  for (const r of rows) counts[r.status]++;

  const q = params.q.toLowerCase().replace(/^#/, "");
  const status = statusFromSlug(params.status);
  const matched = rows.filter(
    (r) => (!status || r.status === status) && (!q || String(r.orderNumber).includes(q) || names.get(r.orderNumber)!.includes(q) || r.sellers.some((s) => s.toLowerCase().includes(q))),
  );

  const pageCount = Math.max(1, Math.ceil(matched.length / CUSTOMER_ORDERS_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  return {
    rows: matched.slice((page - 1) * CUSTOMER_ORDERS_PAGE_SIZE, page * CUSTOMER_ORDERS_PAGE_SIZE),
    counts,
    all: rows.length,
    total: matched.length,
    page,
    pageCount,
  };
}

export type CancelOrderResult = { ok: true; storeName?: string; orderId: string } | { ok: false; error: string };

/**
 * Order.paymentStatus as the roll-up of its sellers' parts (each COD part is paid on its own delivery):
 * PAID once every part still live (not canceled) is paid, UNPAID otherwise. REFUNDED is left alone —
 * it's set by the refund flow, not derived. Call inside the transaction that changed a part.
 */
export async function rollUpPayment(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, storeOrders: { select: { status: true, paymentStatus: true } } } });
  if (!order || order.paymentStatus === "REFUNDED") return;
  const live = order.storeOrders.filter((s) => s.status !== "CANCELED");
  const next = live.length > 0 && live.every((s) => s.paymentStatus === "PAID") ? "PAID" : "UNPAID";
  if (next !== order.paymentStatus) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: next } });
}

/** What a canceled StoreOrder needs to hand back (select these fields). */
export const CANCEL_GIVE_BACK = {
  couponId: true,
  items: { select: { productId: true, variationId: true, qty: true, product: { select: { productType: true } } } },
} satisfies Prisma.StoreOrderSelect;
type GiveBackPart = Prisma.StoreOrderGetPayload<{ select: typeof CANCEL_GIVE_BACK }>;

/**
 * Inside the cancel transaction (customer or seller): stock back to each product / variation and one
 * use back to each store coupon. Call only after the parts were flipped to CANCELED in the same tx.
 */
export async function giveBackCanceled(tx: Prisma.TransactionClient, parts: GiveBackPart[]) {
  for (const item of parts.flatMap((p) => p.items)) {
    // Digital lines never took stock; a deleted product / variation has nothing to give back.
    if (!item.productId || !item.product || item.product.productType === "DIGITAL") continue;
    if (item.variationId) {
      await tx.productVariation.updateMany({ where: { id: item.variationId }, data: { stock: { increment: item.qty } } });
    }
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
  }
  for (const p of parts) {
    if (p.couponId) await tx.coupon.updateMany({ where: { id: p.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  }
}

/**
 * Customer cancels THEIR order while no seller has started packing (every live part PENDING /
 * CONFIRMED) — or, with `storeOrderId`, just one seller's part while that part is PENDING / CONFIRMED
 * (the other sellers carry on). One transaction: the parts flip to CANCELED only if they're still in
 * those statuses (a seller moving it on at the same moment wins), then the stock and coupon
 * redemptions taken at placement are given back. The order record itself always stays.
 */
export async function cancelCustomerOrder(orderNumber: number, customerId: string, storeOrderId?: string): Promise<CancelOrderResult> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId },
    select: { id: true, storeOrders: { select: { id: true, status: true, vendor: { select: { storeName: true } }, ...CANCEL_GIVE_BACK } } },
  });
  if (!order) return { ok: false, error: "We couldn't find that order." };
  const statuses = order.storeOrders.map((s) => s.status);

  let parts: typeof order.storeOrders;
  if (storeOrderId) {
    const part = order.storeOrders.find((s) => s.id === storeOrderId);
    if (!part) return { ok: false, error: "We couldn't find that order." };
    if (!canCustomerCancelPart(statuses, part.status)) {
      return {
        ok: false,
        error:
          part.status === "CANCELED"
            ? "These items were already canceled."
            : CUSTOMER_CANCELABLE.includes(part.status)
              ? "These are the last items left in this order — cancel the whole order instead."
              : `These items can't be canceled any more — ${part.vendor.storeName} has already started preparing them.`,
      };
    }
    parts = [part];
  } else {
    if (!canCustomerCancel(statuses)) return { ok: false, error: "This order can't be canceled any more — a seller has already started preparing it." };
    parts = order.storeOrders.filter((s) => s.status !== "CANCELED");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const flipped = await tx.storeOrder.updateMany({
        where: { id: { in: parts.map((p) => p.id) }, status: { in: CUSTOMER_CANCELABLE } },
        data: { status: "CANCELED" },
      });
      if (flipped.count !== parts.length) {
        throw new Abort({ code: "CART_CHANGED", message: storeOrderId ? "The seller just started preparing these items, so they can't be canceled now." : "A seller just started preparing this order, so it can't be canceled now." });
      }
      await tx.storeOrderStatusEvent.createMany({ data: parts.map((p) => ({ storeOrderId: p.id, status: "CANCELED" as const, actorRole: "CUSTOMER" as const, actorId: customerId })) });
      await giveBackCanceled(tx, parts);
      await rollUpPayment(tx, order.id);
    });
  } catch (error) {
    if (error instanceof Abort) return { ok: false, error: error.detail.message };
    console.error("[orders] cancel failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "We couldn't cancel this order. Please try again." };
  }
  return { ok: true, storeName: storeOrderId ? parts[0]!.vendor.storeName : undefined, orderId: order.id };
}

/** "Hide from my orders" / undo — only the customer's own list changes; the order stays for everyone else. */
export async function setOrderHidden(orderNumber: number, customerId: string, hidden: boolean): Promise<boolean> {
  const res = await prisma.order.updateMany({ where: { orderNumber, customerId }, data: { hiddenByCustomerAt: hidden ? new Date() : null } });
  return res.count === 1;
}

/** Products each seller currently shows on the storefront (Vendor info tab). */
export async function visibleProductCounts(vendorIds: string[]): Promise<Record<string, number>> {
  if (vendorIds.length === 0) return {};
  const rows = await prisma.product.groupBy({ by: ["vendorId"], where: { ...VISIBLE, vendorId: { in: vendorIds } }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.vendorId, r._count._all]));
}

/** This customer's reviews for the given purchased lines, keyed by orderItemId (Reviews tab). */
export async function reviewsForItems(orderItemIds: string[], customerId: string) {
  if (orderItemIds.length === 0) return {};
  const rows = await prisma.review.findMany({
    where: { customerId, orderItemId: { in: orderItemIds } },
    select: { orderItemId: true, rating: true, title: true, comment: true, images: true, status: true, createdAt: true, reply: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.orderItemId, { ...r, images: Array.isArray(r.images) ? r.images.filter((x): x is string => typeof x === "string") : [] }]),
  );
}
