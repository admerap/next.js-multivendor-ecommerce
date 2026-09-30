import "server-only";

import { prisma } from "@/lib/db";
import { noOrders, type OrderStatusKey } from "@/lib/orders";

export type Range = "year" | "month" | "week";
export type Series = { labels: string[]; inhouse: number[]; vendor: number[]; commission?: number[] };

export type AdminDashboardData = {
  totals: { orders: number; stores: number; newStoresThisMonth: number; products: number; customers: number; newCustomersThisMonth: number };
  /** Order counts per status for the Business Analytics period select. */
  statusCounts: Record<"year" | "month" | "today", Record<OrderStatusKey, number>>;
  wallet: { inhouseEarning: number; commission: number; deliveryCharge: number; tax: number; pending: number };
  orderStats: Record<Range, Series>;
  earningStats: Record<Range, Series>;
  /** New sign-ups per role in each period. */
  userOverview: Record<Range, { customers: number; vendors: number; deliveryMen: number }>;
  isEmpty: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABELS: Record<Range, string[]> = {
  year: MONTHS,
  month: ["Week 1", "Week 2", "Week 3", "Week 4"],
  week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const zeros = (n: number) => Array.from({ length: n }, () => 0);
const emptySeries = (range: Range, withCommission = false): Series => {
  const n = LABELS[range].length;
  return { labels: LABELS[range], inhouse: zeros(n), vendor: zeros(n), ...(withCommission && { commission: zeros(n) }) };
};

function periodStart(range: Range, now = new Date()) {
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

/**
 * Marketplace analytics for the admin dashboard. Users and stores are real counts.
 * Orders, products and earnings are zero until the Order/Product models exist (catalog + checkout milestones).
 */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const monthStart = periodStart("month");
  const [customers, stores, newCustomersThisMonth, newStoresThisMonth, overview] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendor.count(),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
    prisma.vendor.count({ where: { createdAt: { gte: monthStart } } }),
    Promise.all(
      (["year", "month", "week"] as const).map(async (range) => {
        const since = periodStart(range);
        const [c, v] = await Promise.all([
          prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
          prisma.user.count({ where: { role: "VENDOR", createdAt: { gte: since } } }),
        ]);
        return [range, { customers: c, vendors: v, deliveryMen: 0 }] as const;
      }),
    ),
  ]);

  return {
    totals: { orders: 0, stores, newStoresThisMonth, products: 0, customers, newCustomersThisMonth },
    statusCounts: { year: noOrders(), month: noOrders(), today: noOrders() },
    wallet: { inhouseEarning: 0, commission: 0, deliveryCharge: 0, tax: 0, pending: 0 },
    orderStats: { year: emptySeries("year"), month: emptySeries("month"), week: emptySeries("week") },
    earningStats: { year: emptySeries("year", true), month: emptySeries("month", true), week: emptySeries("week", true) },
    userOverview: Object.fromEntries(overview) as AdminDashboardData["userOverview"],
    isEmpty: customers === 0 && stores === 0,
  };
}
