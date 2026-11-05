import "server-only";

import { mostRatedProducts, topCustomers, topSellingProducts, topSellingStores, type RatedProduct, type TopCustomer, type TopProduct, type TopStore } from "@/lib/data/dashboard-lists";
import { prisma } from "@/lib/db";
import { deliveredAt, DELIVERY_SELECT } from "@/lib/delivery.server";
import { customerOrderStatus, noOrders, type OrderStatusKey } from "@/lib/orders";
import { rangeBounds, type RangeBounds } from "@/lib/vendor-reports.server";

export type Range = "year" | "month" | "week";
export type Series = { labels: string[]; inhouse: number[]; vendor: number[]; commission?: number[] };

export type AdminDashboardData = {
  totals: {
    orders: number;
    newOrdersThisMonth: number;
    stores: number;
    newStoresThisMonth: number;
    /** Every vendor product, whatever its review status. */
    products: number;
    /** Vendor products waiting for admin review. */
    pendingProducts: number;
    customers: number;
    newCustomersThisMonth: number;
  };
  /** Order counts per status for the Business Analytics period select. */
  statusCounts: Record<"year" | "month" | "today", Record<OrderStatusKey, number>>;
  wallet: { inhouseEarning: number; commission: number; deliveryCharge: number; tax: number; pending: number };
  orderStats: Record<Range, Series>;
  earningStats: Record<Range, Series>;
  /** New sign-ups per role in each period. */
  userOverview: Record<Range, { customers: number; vendors: number; deliveryMen: number }>;
  lists: { customers: TopCustomer[]; stores: TopStore[]; rated: RatedProduct[]; selling: TopProduct[] };
  isEmpty: boolean;
};

const RANGES = ["year", "month", "week"] as const;
const ONGOING: OrderStatusKey[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY"];

const bucketOf = (b: RangeBounds, d: Date) => b.buckets.findIndex((x) => d >= x.start && d < x.end);

/**
 * Marketplace analytics for the admin dashboard, from real orders, users, stores and products.
 *
 * Same rules as Order Manage and the vendor reports:
 *  - An order is counted once, under the status the customer sees (customerOrderStatus), by when it was placed.
 *  - Earnings come from delivered store parts only, charted by their delivery date: Sundry's commission is charged on delivery (commissionState),
 *    and Sundry does the delivery, so the part's shipping is its delivery charge. Tax is what those parts collected.
 *  - Pending amount = commission + delivery charge on parts still on their way (estimates until delivered).
 *  - Vendor earnings = items after the store's coupon − commission, on delivered parts.
 *  - There's no in-house (Sundry Official) store yet, so every order is a vendor order and in-house stays 0.
 */
export async function getAdminDashboard(now = new Date()): Promise<AdminDashboardData> {
  const bounds = Object.fromEntries(RANGES.map((r) => [r, rangeBounds(r, now)])) as Record<Range, RangeBounds>;
  const monthStart = bounds.month.from;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [customers, stores, newCustomersThisMonth, newStoresThisMonth, products, pendingProducts, overview, orders, lists] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendor.count(),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
    prisma.vendor.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.product.count(),
    prisma.product.count({ where: { approvalStatus: "PENDING" } }),
    Promise.all(
      RANGES.map(async (range) => {
        const since = bounds[range].from;
        const [c, v] = await Promise.all([
          prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
          prisma.user.count({ where: { role: "VENDOR", createdAt: { gte: since } } }),
        ]);
        return [range, { customers: c, vendors: v, deliveryMen: 0 }] as const;
      }),
    ),
    prisma.order.findMany({
      select: {
        createdAt: true,
        storeOrders: { select: { status: true, subtotal: true, discount: true, shipping: true, tax: true, commission: true, ...DELIVERY_SELECT } },
      },
    }),
    Promise.all([topCustomers(), topSellingStores(), mostRatedProducts(), topSellingProducts()]).then(([c, s, r, p]) => ({ customers: c, stores: s, rated: r, selling: p })),
  ]);

  const statusCounts = { year: noOrders(), month: noOrders(), today: noOrders() };
  const wallet = { inhouseEarning: 0, commission: 0, deliveryCharge: 0, tax: 0, pending: 0 };
  const orderStats = {} as Record<Range, Series>;
  const earningStats = {} as Record<Range, Series>;
  for (const r of RANGES) {
    const labels = bounds[r].buckets.map((b) => b.label);
    const zeros = () => labels.map(() => 0);
    orderStats[r] = { labels, inhouse: zeros(), vendor: zeros() };
    earningStats[r] = { labels, inhouse: zeros(), vendor: zeros(), commission: zeros() };
  }

  for (const o of orders) {
    const status = customerOrderStatus(o.storeOrders.map((s) => s.status));
    if (o.createdAt >= bounds.year.from) statusCounts.year[status]++;
    if (o.createdAt >= monthStart) statusCounts.month[status]++;
    if (o.createdAt >= todayStart) statusCounts.today[status]++;

    for (const s of o.storeOrders) {
      if (s.status === "DELIVERED") {
        wallet.commission += s.commission;
        wallet.deliveryCharge += s.shipping;
        wallet.tax += s.tax;
        // Earnings count on the delivery date (commission is charged then), orders on the order date.
        const at = deliveredAt(s);
        for (const r of RANGES) {
          const i = bucketOf(bounds[r], at);
          if (i < 0) continue;
          earningStats[r].vendor[i]! += s.subtotal - s.discount - s.commission;
          earningStats[r].commission![i]! += s.commission;
        }
      } else if (ONGOING.includes(s.status)) {
        wallet.pending += s.commission + s.shipping;
      }
    }

    for (const r of RANGES) {
      const i = bucketOf(bounds[r], o.createdAt);
      if (i >= 0) orderStats[r].vendor[i]! += 1;
    }
  }

  return {
    totals: {
      orders: orders.length,
      newOrdersThisMonth: orders.filter((o) => o.createdAt >= monthStart).length,
      stores,
      newStoresThisMonth,
      products,
      pendingProducts,
      customers,
      newCustomersThisMonth,
    },
    statusCounts,
    wallet,
    orderStats,
    earningStats,
    userOverview: Object.fromEntries(overview) as AdminDashboardData["userOverview"],
    lists,
    isEmpty: customers === 0 && stores === 0 && orders.length === 0,
  };
}
