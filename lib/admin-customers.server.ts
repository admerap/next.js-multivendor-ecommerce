import "server-only";

import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { customerOrderStatus, orderAddress, orderProgressNote, type OrderStatusKey } from "@/lib/orders";
import type { AdminCustomerListParams } from "@/lib/validations/admin-customer";

/**
 * Admin › Customer List — every shopper account (role CUSTOMER) with real order figures. Callers must
 * have checked the ADMIN role first.
 *
 * "Orders" = orders the customer placed. "Spent" = what they paid or owe for parts that stuck: store
 * parts not canceled, returned or not delivered (integer cents).
 */

const NOT_SPENT: OrderStatus[] = ["CANCELED", "RETURNED", "FAILED"];
const CUSTOMER = { role: "CUSTOMER" } as const satisfies Prisma.UserWhereInput;

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: Date;
  blockedAt: Date | null;
  orders: number;
  spent: number;
};

export type AdminCustomerList = {
  rows: AdminCustomerRow[];
  /** customer accounts on the platform, no filters (0 → "No customers yet") */
  platformTotal: number;
  /** with the filters: all / active / blocked (the summary next to the title) */
  blocked: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Spend per customer: one query over the parts of their orders. */
async function spendOf(customerIds: string[]): Promise<Map<string, number>> {
  const parts = customerIds.length
    ? await prisma.storeOrder.findMany({ where: { order: { customerId: { in: customerIds } }, status: { notIn: NOT_SPENT } }, select: { total: true, order: { select: { customerId: true } } } })
    : [];
  const spent = new Map<string, number>();
  for (const p of parts) spent.set(p.order.customerId, (spent.get(p.order.customerId) ?? 0) + p.total);
  return spent;
}

const dayStart = (s: string) => new Date(`${s}T00:00:00`);
const ORDER_BY: Record<AdminCustomerListParams["sort"], Prisma.UserOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  orders: [{ orders: { _count: "desc" } }, { createdAt: "desc" }],
  name: [{ name: "asc" }, { id: "asc" }],
};

export async function listAdminCustomers(params: AdminCustomerListParams, { all = false }: { all?: boolean } = {}): Promise<AdminCustomerList> {
  const { q, ordered, joined, status } = params;
  const filters: Prisma.UserWhereInput = {
    ...CUSTOMER,
    ...(joined && { createdAt: { gte: dayStart(joined) } }),
    ...(ordered && { orders: { some: { createdAt: { gte: dayStart(ordered) } } } }),
    ...(q && { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }),
  };
  const where: Prisma.UserWhereInput = { ...filters, ...(status && { blockedAt: status === "blocked" ? { not: null } : null }) };

  const [platformTotal, blocked, total] = await Promise.all([
    prisma.user.count({ where: CUSTOMER }),
    prisma.user.count({ where: { ...filters, blockedAt: { not: null } } }),
    prisma.user.count({ where }),
  ]);
  const pageSize = all ? Math.max(1, total) : params.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const users = await prisma.user.findMany({
    where,
    orderBy: ORDER_BY[params.sort],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, name: true, email: true, phone: true, image: true, createdAt: true, blockedAt: true, _count: { select: { orders: true } } },
  });
  const spent = await spendOf(users.map((u) => u.id));

  return {
    rows: users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, image: u.image, createdAt: u.createdAt, blockedAt: u.blockedAt, orders: u._count.orders, spent: spent.get(u.id) ?? 0 })),
    platformTotal,
    blocked,
    total,
    page,
    pageSize,
    pageCount,
  };
}

/**
 * One customer for the admin: account, figures, last shipping address (addresses are snapshots on
 * orders), the 5 latest orders and the reviews they wrote. Not a customer / unknown → null.
 */
export async function getAdminCustomer(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, ...CUSTOMER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      createdAt: true,
      blockedAt: true,
      _count: { select: { orders: true, reviews: true, wishlist: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          orderNumber: true,
          createdAt: true,
          total: true,
          paymentStatus: true,
          shipName: true, shipPhone: true, shipEmail: true, shipAddress: true, shipAddress2: true, shipCity: true, shipState: true, shipZip: true, shipCountry: true,
          billingSameAsShipping: true, billName: true, billPhone: true, billEmail: true, billAddress: true, billAddress2: true, billCity: true, billState: true, billZip: true, billCountry: true,
          storeOrders: { select: { status: true, total: true, vendor: { select: { storeName: true } } } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, comment: true, status: true, isVisible: true, createdAt: true, product: { select: { id: true, name: true, thumbnail: true } } },
      },
    },
  });
  if (!user) return null;
  const spent = (await spendOf([user.id])).get(user.id) ?? 0;
  const latest = user.orders[0];
  return {
    ...user,
    spent,
    lastAddress: latest ? orderAddress(latest, "ship") : null,
    recentOrders: user.orders.map((o) => {
      const statuses = o.storeOrders.map((s) => s.status as OrderStatusKey);
      const live = o.storeOrders.filter((s) => !NOT_SPENT.includes(s.status));
      return {
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        total: live.reduce((n, s) => n + s.total, 0),
        paymentStatus: o.paymentStatus,
        status: customerOrderStatus(statuses),
        progressNote: orderProgressNote(statuses),
        stores: o.storeOrders.map((s) => s.vendor.storeName),
      };
    }),
  };
}
export type AdminCustomer = NonNullable<Awaited<ReturnType<typeof getAdminCustomer>>>;

/** Block / unblock a customer account (admin only — the caller checked the role). Returns false when it isn't a customer. */
export async function setCustomerBlocked(id: string, blocked: boolean): Promise<boolean> {
  const res = await prisma.user.updateMany({ where: { id, ...CUSTOMER }, data: { blockedAt: blocked ? new Date() : null } });
  return res.count === 1;
}
