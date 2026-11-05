import "server-only";

import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * "Top N" lists shared by the admin and vendor dashboards. Pass `vendorId` (from the session) to scope a
 * list to one store; omit it for the whole marketplace (admin only).
 *
 * Same "sold" rule as Report Manage: a part that was CANCELED / RETURNED / FAILED didn't stay with the buyer.
 * Revenue = items after the store's coupon, before tax (lineTotal − tax).
 */
const NOT_SOLD: OrderStatus[] = ["CANCELED", "RETURNED", "FAILED"];
const TOP = 5;

export type TopProduct = { id: string; name: string; thumbnail: string | null; store: string; sold: number; revenue: number };
export type RatedProduct = { id: string; name: string; thumbnail: string | null; store: string; price: number; ratingAvg: number; reviewCount: number };
export type TopStore = { id: string; name: string; logo: string | null; orders: number; revenue: number };
export type TopCustomer = { id: string; name: string; email: string; image: string | null; orders: number };

export async function topSellingProducts(vendorId?: string): Promise<TopProduct[]> {
  const groups = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, storeOrder: { status: { notIn: NOT_SOLD }, ...(vendorId && { vendorId }) } },
    _sum: { qty: true, lineTotal: true, tax: true },
    orderBy: { _sum: { qty: "desc" } },
    take: TOP,
  });
  const ids = groups.map((g) => g.productId!);
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, thumbnail: true, vendor: { select: { storeName: true } } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  return groups.flatMap((g) => {
    const p = byId.get(g.productId!);
    if (!p) return [];
    return [{ id: p.id, name: p.name, thumbnail: p.thumbnail, store: p.vendor.storeName, sold: g._sum.qty ?? 0, revenue: (g._sum.lineTotal ?? 0) - (g._sum.tax ?? 0) }];
  });
}

/** Products with at least one published review, best average first (ties: more reviews). */
export async function mostRatedProducts(vendorId?: string): Promise<RatedProduct[]> {
  const rows = await prisma.product.findMany({
    where: { reviewCount: { gt: 0 }, ...(vendorId && { vendorId }) },
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }, { name: "asc" }],
    take: TOP,
    select: { id: true, name: true, thumbnail: true, price: true, ratingAvg: true, reviewCount: true, vendor: { select: { storeName: true } } },
  });
  return rows.map(({ vendor, ...p }) => ({ ...p, store: vendor.storeName }));
}

/** Stores ranked by what buyers paid for their sold parts. Admin only. */
export async function topSellingStores(): Promise<TopStore[]> {
  const groups = await prisma.storeOrder.groupBy({
    by: ["vendorId"],
    where: { status: { notIn: NOT_SOLD } },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: "desc" } },
    take: TOP,
  });
  const stores = await prisma.vendor.findMany({ where: { id: { in: groups.map((g) => g.vendorId) } }, select: { id: true, storeName: true, logo: true } });
  const byId = new Map(stores.map((s) => [s.id, s]));
  return groups.flatMap((g) => {
    const s = byId.get(g.vendorId);
    return s ? [{ id: s.id, name: s.storeName, logo: s.logo, orders: g._count._all, revenue: g._sum.total ?? 0 }] : [];
  });
}

/** Customers with the most orders. Admin only. */
export async function topCustomers(): Promise<TopCustomer[]> {
  const rows = await prisma.user.findMany({
    where: { role: "CUSTOMER", orders: { some: {} } },
    orderBy: [{ orders: { _count: "desc" } }, { name: "asc" }],
    take: TOP,
    select: { id: true, name: true, email: true, image: true, _count: { select: { orders: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, orders: _count.orders }));
}
