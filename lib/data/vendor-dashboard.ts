import "server-only";

import { prisma } from "@/lib/db";
import { noOrders, type OrderStatusKey } from "@/lib/orders";

export type VendorRange = "year" | "month" | "week";

export type VendorDashboardData = {
  store: { name: string; slug: string };
  statusCounts: Record<"overall" | "today" | "month", Record<OrderStatusKey, number>>;
  wallet: {
    withdrawable: number;
    pendingWithdraw: number;
    totalCommission: number;
    alreadyWithdrawn: number;
    deliveryCharge: number;
    totalTax: number;
    totalSales: number;
  };
  earnings: Record<VendorRange, { labels: string[]; income: number[]; commission: number[] }>;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABELS: Record<VendorRange, string[]> = {
  year: MONTHS,
  month: ["Week 1", "Week 2", "Week 3", "Week 4"],
  week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const emptyEarnings = (r: VendorRange) => ({ labels: LABELS[r], income: zeros(LABELS[r].length), commission: zeros(LABELS[r].length) });

/**
 * Store analytics for the signed-in vendor. `vendorId` must come from the server session, never the client.
 * Orders, payouts and earnings are zero until the StoreOrder/Payout models exist.
 */
export async function getVendorDashboard(vendorId: string): Promise<VendorDashboardData> {
  const store = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: { storeName: true, slug: true },
  });

  return {
    store: { name: store.storeName, slug: store.slug },
    statusCounts: { overall: noOrders(), today: noOrders(), month: noOrders() },
    wallet: {
      withdrawable: 0,
      pendingWithdraw: 0,
      totalCommission: 0,
      alreadyWithdrawn: 0,
      deliveryCharge: 0,
      totalTax: 0,
      totalSales: 0,
    },
    earnings: { year: emptyEarnings("year"), month: emptyEarnings("month"), week: emptyEarnings("week") },
  };
}
