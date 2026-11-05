import "server-only";

import { mostRatedProducts, topSellingProducts, type RatedProduct, type TopProduct } from "@/lib/data/dashboard-lists";
import { prisma } from "@/lib/db";
import { deliveredAt, DELIVERY_SELECT } from "@/lib/delivery.server";
import { noOrders, type OrderStatusKey } from "@/lib/orders";
import { rangeBounds, type RangeBounds } from "@/lib/vendor-reports.server";

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
  /** This store's own products only. */
  lists: { rated: RatedProduct[]; selling: TopProduct[] };
};

const RANGES = ["year", "month", "week"] as const;
const ONGOING: OrderStatusKey[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY"];
const NOT_SOLD: OrderStatusKey[] = ["CANCELED", "RETURNED", "FAILED"];

const bucketOf = (b: RangeBounds, d: Date) => b.buckets.findIndex((x) => d >= x.start && d < x.end);

/**
 * Store analytics for the signed-in vendor. `vendorId` must come from the server session, never the client.
 *
 * Same definitions as Report Manage › Transactions (lib/vendor-reports.server.ts):
 *  - Status counts are this store's parts, by when they were ordered.
 *  - Net earnings = items after the store's coupon − Sundry's commission. Delivered parts are earned
 *    (withdrawable), parts still on their way are pending. Commission is only charged on delivery.
 *  - Delivery charge and tax = what the delivered parts collected. Total sales = what buyers pay for parts
 *    that weren't canceled, returned or failed.
 *  - Payouts arrive with Stripe Connect, so nothing has been withdrawn yet.
 */
export async function getVendorDashboard(vendorId: string, now = new Date()): Promise<VendorDashboardData> {
  const [store, parts, rated, selling] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { storeName: true, slug: true } }),
    prisma.storeOrder.findMany({
      where: { vendorId },
      select: { status: true, subtotal: true, discount: true, shipping: true, tax: true, total: true, commission: true, ...DELIVERY_SELECT },
    }),
    mostRatedProducts(vendorId),
    topSellingProducts(vendorId),
  ]);

  const bounds = Object.fromEntries(RANGES.map((r) => [r, rangeBounds(r, now)])) as Record<VendorRange, RangeBounds>;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statusCounts = { overall: noOrders(), today: noOrders(), month: noOrders() };
  const wallet = { withdrawable: 0, pendingWithdraw: 0, totalCommission: 0, alreadyWithdrawn: 0, deliveryCharge: 0, totalTax: 0, totalSales: 0 };
  const earnings = {} as VendorDashboardData["earnings"];
  for (const r of RANGES) {
    const labels = bounds[r].buckets.map((b) => b.label);
    earnings[r] = { labels, income: labels.map(() => 0), commission: labels.map(() => 0) };
  }

  for (const p of parts) {
    statusCounts.overall[p.status]++;
    if (p.createdAt >= bounds.month.from) statusCounts.month[p.status]++;
    if (p.createdAt >= todayStart) statusCounts.today[p.status]++;

    const net = p.subtotal - p.discount - p.commission;
    if (!NOT_SOLD.includes(p.status)) wallet.totalSales += p.total;
    if (ONGOING.includes(p.status)) wallet.pendingWithdraw += net;
    if (p.status !== "DELIVERED") continue;
    wallet.withdrawable += net;
    wallet.totalCommission += p.commission;
    wallet.deliveryCharge += p.shipping;
    wallet.totalTax += p.tax;
    const at = deliveredAt(p); // earnings count on the delivery date — commission is charged then
    for (const r of RANGES) {
      const i = bucketOf(bounds[r], at);
      if (i < 0) continue;
      earnings[r].income[i]! += net;
      earnings[r].commission[i]! += p.commission;
    }
  }

  return { store: { name: store.storeName, slug: store.slug }, statusCounts, wallet, earnings, lists: { rated, selling } };
}
