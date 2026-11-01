import "server-only";

import { Prisma, type PaymentMethod } from "@prisma/client";
import type { CartLineInput, CartQuote, ShippingMethod } from "@/lib/checkout";
import { quoteCart } from "@/lib/checkout.server";
import { prisma } from "@/lib/db";
import { VISIBLE } from "@/lib/storefront.server";
import { canCustomerCancel, customerOrderStatus, ORDER_STATUSES, statusFromSlug, type OrderStatusKey } from "@/lib/orders";
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
export type PlaceOrderResult = { ok: true; orderNumber: number; total: number } | ({ ok: false } & PlaceOrderError);

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
  const quote = await quoteCart(input.lines, { coupons: input.coupons, userId: input.customerId, shippingMethod: input.shippingMethod });
  const problem = quoteProblem(quote, input);
  if (problem) return { ok: false, ...problem };

  const { shipping, billingSame, billing } = input.addresses;
  const stores = quote.stores.filter((s) => s.lines.some((l) => l.available));

  // Payment seam: COD now — the order starts UNPAID and is paid on delivery.
  // TODO(stripe): for STRIPE, create the PaymentIntent here and let the webhook mark the order PAID.
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
          select: { orderNumber: true, total: true },
        });
      });
      return { ok: true, orderNumber: order.orderNumber, total: order.total };
    } catch (error) {
      if (error instanceof Abort) return { ok: false, ...error.detail };
      // Two orders took the same number at once → the unique index refused one; take the next number.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }
}

// ── Reading an order back (confirmation page, invoice) ──

const ORDER_VIEW = {
  storeOrders: {
    orderBy: { createdAt: "asc" },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true, logo: true, storeAddress: true, status: true } },
      items: { orderBy: { productName: "asc" } },
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
        select: { status: true, vendor: { select: { storeName: true } }, items: { select: { qty: true, image: true, productName: true } } },
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
      total: o.total,
      status: customerOrderStatus(statuses),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      sellers: o.storeOrders.map((s) => s.vendor.storeName),
      images: items.flatMap((i) => (i.image ? [i.image] : [])).slice(0, 4),
      canCancel: canCustomerCancel(statuses),
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

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Customer cancels THEIR order while no seller has started packing (every live part PENDING /
 * CONFIRMED). One transaction: the parts flip to CANCELED only if they're still in those statuses (a
 * seller moving it on at the same moment wins), then the stock and coupon redemptions taken at
 * placement are given back. The order record itself always stays.
 */
export async function cancelCustomerOrder(orderNumber: number, customerId: string): Promise<CancelOrderResult> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId },
    select: {
      id: true,
      storeOrders: {
        select: {
          id: true,
          status: true,
          couponId: true,
          items: { select: { productId: true, variationId: true, qty: true, product: { select: { productType: true } } } },
        },
      },
    },
  });
  if (!order) return { ok: false, error: "We couldn't find that order." };
  if (!canCustomerCancel(order.storeOrders.map((s) => s.status))) {
    return { ok: false, error: "This order can't be canceled any more — a seller has already started preparing it." };
  }
  const parts = order.storeOrders.filter((s) => s.status !== "CANCELED");

  try {
    await prisma.$transaction(async (tx) => {
      const flipped = await tx.storeOrder.updateMany({
        where: { id: { in: parts.map((p) => p.id) }, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "CANCELED" },
      });
      if (flipped.count !== parts.length) throw new Abort({ code: "CART_CHANGED", message: "A seller just started preparing this order, so it can't be canceled now." });

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
    });
  } catch (error) {
    if (error instanceof Abort) return { ok: false, error: error.detail.message };
    console.error("[orders] cancel failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "We couldn't cancel this order. Please try again." };
  }
  return { ok: true };
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
    select: { orderItemId: true, rating: true, title: true, comment: true, images: true, status: true, createdAt: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.orderItemId, { ...r, images: Array.isArray(r.images) ? r.images.filter((x): x is string => typeof x === "string") : [] }]),
  );
}
