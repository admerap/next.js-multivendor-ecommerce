import "server-only";

import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canceledPartsTotal, customerOrderStatus, noOrders, orderProgressNote, type OrderStatusKey } from "@/lib/orders";
import { ORDER_VIEW, type OrderView } from "@/lib/orders.server";
import type { AdminOrderListParams } from "@/lib/validations/admin-order";

/**
 * Admin › Order Manage — platform-wide, read-only oversight of every order (all customers, all
 * stores). NO store scoping here: the admin is the oversight role. Callers must have checked the ADMIN
 * permission (requirePermission("orders") on pages, can("orders") in route handlers) first.
 *
 * STATUS RULE for orders split across several stores: an order is listed under its OVERALL status —
 * the least advanced of its live parts (canceled parts ignored; all canceled → Canceled), the same
 * status the customer sees (customerOrderStatus). So every order sits in exactly one status list, the
 * lists add up to All, and the row's badge always matches the filter. Because Pending is the first
 * step, the Pending list holds every order with at least one part a store hasn't confirmed yet.
 */

/** Orders per overall status (sidebar counts). One query over the parts' statuses, grouped here. */
export async function adminOrderStatusCounts(): Promise<Record<OrderStatusKey, number>> {
  const parts = await prisma.storeOrder.findMany({ select: { orderId: true, status: true } });
  const byOrder = new Map<string, OrderStatusKey[]>();
  for (const p of parts) byOrder.set(p.orderId, [...(byOrder.get(p.orderId) ?? []), p.status]);
  const counts = noOrders();
  for (const statuses of byOrder.values()) counts[customerOrderStatus(statuses)]++;
  return counts;
}

export type AdminOrderRow = {
  orderNumber: number;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** every store in the order (first = the earliest part) */
  stores: { id: string; name: string }[];
  /** units across every store */
  itemCount: number;
  /** grand total still due: canceled stores' parts taken off when only some were canceled */
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** overall status (see the status rule above) + "2 of 3 delivered" when stores differ */
  status: OrderStatusKey;
  progressNote: string | null;
};

export type AdminOrderList = {
  rows: AdminOrderRow[];
  /** orders per overall status, with the search / panel filters applied (the summary tiles) */
  counts: Record<OrderStatusKey, number>;
  /** orders on the platform, no filters (false → "No orders yet") */
  platformTotal: number;
  /** stores that have orders (Filter › Store options) */
  storeOptions: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** YYYY-MM-DD → local day bounds (`to` inclusive). */
const dayStart = (s: string) => new Date(`${s}T00:00:00`);
const nextDay = (s: string) => {
  const d = dayStart(s);
  d.setDate(d.getDate() + 1);
  return d;
};
const PAYMENT: Record<NonNullable<AdminOrderListParams["payment"]>, PaymentStatus> = { paid: "PAID", unpaid: "UNPAID", refunded: "REFUNDED" };

/**
 * The order list: search / store / payment / dates filter in the query; the overall status is derived
 * from the parts, so the status filter and the tiles are applied here. `all` returns every match in
 * one page (export).
 */
export async function listAdminOrders(params: AdminOrderListParams, { all = false }: { all?: boolean } = {}): Promise<AdminOrderList> {
  const { q, store, payment, from, to } = params;
  const number = /^#?\d{1,10}$/.test(q) ? Number(q.replace("#", "")) : null;
  const where: Prisma.OrderWhereInput = {
    ...(payment && { paymentStatus: PAYMENT[payment] }),
    ...(store && { storeOrders: { some: { vendorId: store } } }),
    ...((from || to) && { createdAt: { ...(from && { gte: dayStart(from) }), ...(to && { lt: nextDay(to) }) } }),
    ...(q && {
      OR: [
        ...(number !== null && Number.isSafeInteger(number) ? [{ orderNumber: number }] : []),
        { shipName: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { email: { contains: q } } },
      ],
    }),
  };

  const [orders, platformTotal, storeOptions] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        orderNumber: true,
        createdAt: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        shipPhone: true,
        customer: { select: { name: true, email: true } },
        storeOrders: { orderBy: { createdAt: "asc" }, select: { status: true, total: true, vendor: { select: { id: true, storeName: true } }, items: { select: { qty: true } } } },
      },
    }),
    prisma.order.count(),
    prisma.vendor.findMany({ where: { storeOrders: { some: {} } }, select: { id: true, storeName: true }, orderBy: { storeName: "asc" } }),
  ]);

  const counts = noOrders();
  const rows: AdminOrderRow[] = orders.map((o) => {
    const statuses = o.storeOrders.map((s) => s.status);
    const status = customerOrderStatus(statuses);
    counts[status]++;
    return {
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      customerName: o.customer.name,
      customerEmail: o.customer.email,
      customerPhone: o.shipPhone,
      stores: o.storeOrders.map((s) => ({ id: s.vendor.id, name: s.vendor.storeName })),
      itemCount: o.storeOrders.reduce((n, s) => n + s.items.reduce((m, i) => m + i.qty, 0), 0),
      total: o.total - canceledPartsTotal(o.storeOrders),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status,
      progressNote: orderProgressNote(statuses),
    };
  });

  const matched = params.status ? rows.filter((r) => r.status === params.status) : rows;
  const pageSize = all ? Math.max(1, matched.length) : params.pageSize;
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(params.page, pageCount);
  return {
    rows: matched.slice((page - 1) * pageSize, page * pageSize),
    counts,
    platformTotal,
    storeOptions: storeOptions.map((s) => ({ id: s.id, name: s.storeName })),
    total: matched.length,
    page,
    pageSize,
    pageCount,
  };
}

/** One order in full — every store's part, items and totals, customer and addresses. Unknown → null. */
export async function getAdminOrder(orderNumber: number): Promise<(OrderView & { customer: { name: string; email: string; phone: string | null; createdAt: Date } }) | null> {
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1) return null;
  return prisma.order.findUnique({
    where: { orderNumber },
    include: { ...ORDER_VIEW, customer: { select: { name: true, email: true, phone: true, createdAt: true } } },
  });
}
