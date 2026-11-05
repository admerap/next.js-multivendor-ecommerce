import "server-only";

import { Prisma, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canVendorMove, maskPhone, noOrders, ORDER_STATUS_LABEL, type OrderStatusKey } from "@/lib/orders";
import { CANCEL_GIVE_BACK, giveBackCanceled, ORDER_VIEW, rollUpPayment, type OrderView } from "@/lib/orders.server";
import type { VendorOrderListParams } from "@/lib/validations/vendor-order";

/**
 * Seller Center order data. Every function takes the vendorId from the caller, who must get it from
 * the session (currentVendorId / requireArea) — never from the client. A vendor only ever reads or
 * changes its own StoreOrders (its part of each customer order), and never sees the buyer's full phone
 * or email (Sundry delivers; the designs mask them).
 */

export type VendorOrderRow = {
  /** StoreOrder id — the /vendor/orders/[id] key. */
  id: string;
  orderNumber: number;
  createdAt: Date;
  customerName: string;
  /** masked: "+1 •••• 0142" */
  customerPhone: string;
  /** units of this store's lines */
  itemCount: number;
  /** what the buyer pays for this store's part (items − coupon + shipping + tax), cents */
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatusKey;
};

export type VendorOrderList = {
  storeName: string;
  rows: VendorOrderRow[];
  /** this store's orders per status (all of them, regardless of the search) — the summary tiles */
  counts: Record<OrderStatusKey, number>;
  /** this store's orders, all statuses */
  allCount: number;
  /** rows matching the current status + search */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** The list's filter (status + search), always inside this store. Shared by the page and the CSV export. */
function listWhere(vendorId: string, { q, status }: Pick<VendorOrderListParams, "q" | "status">): Prisma.StoreOrderWhereInput {
  const number = /^#?\d{1,10}$/.test(q) ? Number(q.replace("#", "")) : null;
  return {
    vendorId,
    ...(status && { status }),
    ...(q && {
      OR: [
        ...(number !== null && Number.isSafeInteger(number) ? [{ order: { orderNumber: number } }] : []),
        { order: { shipName: { contains: q } } },
        { order: { customer: { name: { contains: q } } } },
      ],
    }),
  };
}

const ROW_SELECT = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  items: { select: { qty: true } },
  paymentStatus: true,
  order: { select: { orderNumber: true, shipName: true, shipPhone: true, paymentMethod: true } },
} satisfies Prisma.StoreOrderSelect;

const toRow = (s: Prisma.StoreOrderGetPayload<{ select: typeof ROW_SELECT }>): VendorOrderRow => ({
  id: s.id,
  orderNumber: s.order.orderNumber,
  createdAt: s.createdAt,
  customerName: s.order.shipName,
  customerPhone: maskPhone(s.order.shipPhone),
  itemCount: s.items.reduce((n, i) => n + i.qty, 0),
  total: s.total,
  paymentMethod: s.order.paymentMethod,
  paymentStatus: s.paymentStatus, // this store's part, not the whole order
  status: s.status,
});

const NEWEST_FIRST: Prisma.StoreOrderOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

export async function listVendorOrders(vendorId: string, params: VendorOrderListParams): Promise<VendorOrderList> {
  const where = listWhere(vendorId, params);
  const [store, byStatus, total] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { storeName: true } }),
    prisma.storeOrder.groupBy({ by: ["status"], where: { vendorId }, _count: { _all: true } }),
    prisma.storeOrder.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const current = Math.min(params.page, pageCount);
  const found = await prisma.storeOrder.findMany({
    where,
    orderBy: NEWEST_FIRST,
    skip: (current - 1) * params.pageSize,
    take: params.pageSize,
    select: ROW_SELECT,
  });

  const counts = noOrders();
  for (const r of byStatus) counts[r.status] = r._count._all;
  return {
    storeName: store.storeName,
    rows: found.map(toRow),
    counts,
    allCount: Object.values(counts).reduce((a, b) => a + b, 0),
    total,
    page: current,
    pageSize: params.pageSize,
    pageCount,
  };
}

/** Rows a CSV export may hold (newest first) — a ceiling so one click can't build an unbounded file. */
export const EXPORT_MAX_ROWS = 5000;

/** Every row matching the list's current filter (not just one page), for Export. */
export async function exportVendorOrders(vendorId: string, params: Pick<VendorOrderListParams, "q" | "status">): Promise<VendorOrderRow[]> {
  const found = await prisma.storeOrder.findMany({ where: listWhere(vendorId, params), orderBy: NEWEST_FIRST, take: EXPORT_MAX_ROWS, select: ROW_SELECT });
  return found.map(toRow);
}

/**
 * The customer order behind one of THIS store's sub-orders, trimmed to this store's part: only its
 * StoreOrder, the order totals replaced by that part's totals, phones masked and emails left out — so
 * nothing from other sellers, and no buyer contact details, reach the vendor (page and invoice alike).
 * Another store's id → null, the same as an unknown one.
 */
export async function getVendorOrderView(storeOrderId: string, vendorId: string): Promise<OrderView | null> {
  const order = await prisma.order.findFirst({
    where: { storeOrders: { some: { id: storeOrderId, vendorId } } },
    include: { storeOrders: { ...ORDER_VIEW.storeOrders, where: { id: storeOrderId, vendorId } } },
  });
  const part = order?.storeOrders[0];
  if (!order || !part) return null;
  return {
    ...order,
    subtotal: part.subtotal,
    discount: part.discount,
    shipping: part.shipping,
    tax: part.tax,
    total: part.total,
    paymentStatus: part.paymentStatus, // this store's part is paid (or not) on its own
    shipPhone: maskPhone(order.shipPhone),
    shipEmail: "",
    billPhone: order.billPhone && maskPhone(order.billPhone),
    billEmail: null,
  };
}

export type VendorStatusResult = { ok: true; orderNumber: number; from: OrderStatusKey } | { ok: false; error: string };

/**
 * Seller moves its own StoreOrder to `to` — writes StoreOrder.status (the one status field every view
 * reads: customer order details, tracking, admin). Only the transitions in VENDOR_NEXT_STATUSES; the
 * update is conditional on the status the seller saw, so two tabs can't skip or repeat a step.
 * Canceling gives the stock and the coupon use back, like a customer cancel. Every move is recorded
 * in the part's history (who, when); a COD part delivered is marked paid, and the order's payment
 * status is rolled up from its parts.
 */
export async function updateVendorOrderStatus(storeOrderId: string, vendorId: string, to: OrderStatusKey, actorId: string): Promise<VendorStatusResult> {
  const part = await prisma.storeOrder.findFirst({
    where: { id: storeOrderId, vendorId },
    select: { id: true, status: true, orderId: true, order: { select: { orderNumber: true, paymentMethod: true } }, ...CANCEL_GIVE_BACK },
  });
  if (!part) return { ok: false, error: "We couldn't find that order." };
  if (part.status === to) return { ok: false, error: `This order is already ${ORDER_STATUS_LABEL[to].toLowerCase()}.` };
  if (!canVendorMove(part.status, to)) {
    return { ok: false, error: `An order that is ${ORDER_STATUS_LABEL[part.status].toLowerCase()} can't be moved to ${ORDER_STATUS_LABEL[to].toLowerCase()}.` };
  }

  try {
    const moved = await prisma.$transaction(async (tx) => {
      // Cash on delivery: the courier collects this part's cash when it's delivered.
      const collected = to === "DELIVERED" && part.order.paymentMethod === "COD";
      const flipped = await tx.storeOrder.updateMany({
        where: { id: part.id, vendorId, status: part.status },
        data: { status: to, ...(collected && { paymentStatus: "PAID", paidAt: new Date() }) },
      });
      if (flipped.count !== 1) return false;
      await tx.storeOrderStatusEvent.create({ data: { storeOrderId: part.id, status: to, actorRole: "VENDOR", actorId } });
      if (to === "CANCELED") await giveBackCanceled(tx, [part]);
      if (collected || to === "CANCELED") await rollUpPayment(tx, part.orderId);
      return true;
    });
    if (!moved) return { ok: false, error: "This order was just updated somewhere else. Reload the page to see its current status." };
  } catch (error) {
    console.error("[vendor-orders] status update failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "We couldn't update this order. Please try again." };
  }
  return { ok: true, orderNumber: part.order.orderNumber, from: part.status };
}
