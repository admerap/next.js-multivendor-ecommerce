import "server-only";

import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliveredAt, deliveredBetween, DELIVERY_SELECT } from "@/lib/delivery.server";
import { commissionState, type CommissionState } from "@/lib/orders";
import { LOW_STOCK } from "@/lib/validations/product";
import type {
  OrderGroup,
  OrderReportParams,
  PaymentFilter,
  ProductReportParams,
  ReportRange,
  TransactionReportParams,
} from "@/lib/validations/vendor-report";

/**
 * Seller Center › Report Manage — read-only analytics COMPUTED ON READ from this store's orders
 * (StoreOrder + OrderItem), products and reviews. Nothing is stored or written here.
 *
 * Every function takes the vendorId from the caller, who must get it from the session; every query is
 * filtered by it. Money is integer cents (CLAUDE.md §6) — sums are integer adds, never floats.
 *
 * Shared definitions:
 *  - A part counts in a range by its StoreOrder.createdAt (when it was ordered) — except EARNINGS and
 *    expenses (commission, coupons funded, net), which count on the delivery date (lib/delivery.server).
 *  - "Sold" = the part wasn't CANCELED / RETURNED / FAILED (those units never stayed with the buyer).
 *  - Sales amount = what the buyer pays for the store's part (StoreOrder.total), canceled parts left out.
 *  - Net earnings = items after the store's coupon (subtotal − discount) − Sundry's commission.
 *    Shipping and tax are shown separately: they aren't the store's revenue.
 *  - Product discount isn't recorded on past orders (OrderItem keeps the price paid only) → null, shown "—".
 */

// ── Date ranges ────────────────────────────────────────────────────────────────────────────────

export type Bucket = { label: string; start: Date; end: Date };
export type RangeBounds = { range: ReportRange; from: Date; to: Date; buckets: Bucket[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The preset's window and its chart buckets, in the server's local time: This year → 12 months,
 * This month → weeks (1–7, 8–14, 15–21, 22–28, 29–end), This week → Monday…Sunday. `to` is exclusive.
 */
export function rangeBounds(range: ReportRange, now = new Date()): RangeBounds {
  const y = now.getFullYear(), m = now.getMonth();
  if (range === "year") {
    const buckets = MONTHS.map((label, i) => ({ label, start: new Date(y, i, 1), end: new Date(y, i + 1, 1) }));
    return { range, from: buckets[0]!.start, to: buckets[11]!.end, buckets };
  }
  if (range === "month") {
    const end = new Date(y, m + 1, 1);
    const buckets: Bucket[] = [];
    for (let d = 1, w = 1; new Date(y, m, d) < end; d += 7, w++) {
      const start = new Date(y, m, d), next = new Date(y, m, d + 7);
      buckets.push({ label: `Week ${w}`, start, end: next < end ? next : end });
    }
    return { range, from: buckets[0]!.start, to: end, buckets };
  }
  const monday = new Date(y, m, now.getDate() - ((now.getDay() + 6) % 7));
  const buckets = DAYS.map((label, i) => ({ label, start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i + 1) }));
  return { range, from: buckets[0]!.start, to: buckets[6]!.end, buckets };
}

const bucketOf = (b: RangeBounds, d: Date) => b.buckets.findIndex((x) => d >= x.start && d < x.end);
/** One zeroed number per bucket, then `add(date, n)` puts n in the right one. */
function series(b: RangeBounds) {
  const values = b.buckets.map(() => 0);
  return { values, add: (d: Date, n: number) => { const i = bucketOf(b, d); if (i >= 0) values[i]! += n; } };
}

const inRange = (b: RangeBounds) => ({ gte: b.from, lt: b.to });
const NOT_SOLD: OrderStatus[] = ["CANCELED", "RETURNED", "FAILED"];
export const ORDER_GROUP_STATUSES: Record<OrderGroup, OrderStatus[]> = {
  completed: ["DELIVERED"],
  ongoing: ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY"],
  canceled: ["CANCELED", "RETURNED", "FAILED"],
};
const PAYMENT_OF: Record<PaymentFilter, PaymentStatus> = { completed: "PAID", pending: "UNPAID", refunded: "REFUNDED" };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** `now`: the reference date (tests); `all`: every matching row in one page (exports). */
export type ReportOpts = { now?: Date; all?: boolean };

/** Page `rows` (1-based; an out-of-range page lands on the last one); `all` returns them in one page. */
function paginate<T>(rows: T[], page: number, size: number, all = false) {
  const pageSize = all ? Math.max(1, rows.length) : size;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), total: rows.length, page: current, pageSize, pageCount };
}
export type Paged<T> = ReturnType<typeof paginate<T>>;

/** "#100002" or "100002" → the order number filter; anything else matches nothing numeric. */
const orderNumberOf = (q: string) => (/^#?\d{1,10}$/.test(q) ? Number(q.replace("#", "")) : null);

/** This store's parts ordered in the range, with what every report needs — one query, no N+1. */
const PART_SELECT = {
  id: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  subtotal: true,
  discount: true,
  shipping: true,
  tax: true,
  total: true,
  commission: true,
  couponCode: true,
  items: { select: { qty: true } },
  order: { select: { orderNumber: true, customerId: true, shipName: true, customer: { select: { name: true } } } },
} satisfies Prisma.StoreOrderSelect;
type PartRow = Prisma.StoreOrderGetPayload<{ select: typeof PART_SELECT }>;

const partsInRange = (vendorId: string, b: RangeBounds) =>
  prisma.storeOrder.findMany({ where: { vendorId, createdAt: inRange(b) }, select: PART_SELECT, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });

const customerName = (p: PartRow) => p.order.customer.name ?? p.order.shipName;

// ── Order Report ───────────────────────────────────────────────────────────────────────────────

export type OrderReportRow = {
  id: string;
  orderNumber: number;
  createdAt: Date;
  total: number;
  /** not recorded on past orders */
  productDiscount: null;
  couponDiscount: number;
  shipping: number;
  tax: number;
  /** computed at placement; see commissionState for whether it's charged */
  commission: number;
  commissionState: CommissionState;
  status: OrderStatus;
};

export type OrderReport = {
  bounds: RangeBounds;
  /** the store ever had an order (false → "No orders yet"; true with 0 in range → "No orders in this range") */
  hasAnyOrders: boolean;
  storeName: string;
  /** every part ordered in the range (all statuses) */
  totalOrders: number;
  /** sales amount: parts not canceled / returned / failed */
  totalAmount: number;
  avgOrderValue: number;
  groups: Record<OrderGroup, number>;
  /** Payment Statistics: amounts by this store's payment status (live parts only) */
  payments: { paid: number; unpaid: number; refunded: number };
  /** chart: sales amount per bucket */
  chart: { labels: string[]; amount: number[]; orders: number[] };
  table: Paged<OrderReportRow>;
};

export async function getOrderReport(vendorId: string, params: OrderReportParams, { now = new Date(), all = false }: ReportOpts = {}): Promise<OrderReport> {
  const b = rangeBounds(params.range, now);
  const [parts, any, store] = await Promise.all([
    partsInRange(vendorId, b),
    prisma.storeOrder.findFirst({ where: { vendorId }, select: { id: true } }),
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { storeName: true } }),
  ]);

  const groups: Record<OrderGroup, number> = { completed: 0, ongoing: 0, canceled: 0 };
  const amount = series(b), orders = series(b);
  const payments = { paid: 0, unpaid: 0, refunded: 0 };
  let totalAmount = 0, sold = 0;
  for (const p of parts) {
    const g = (Object.keys(ORDER_GROUP_STATUSES) as OrderGroup[]).find((k) => ORDER_GROUP_STATUSES[k].includes(p.status))!;
    groups[g]++;
    orders.add(p.createdAt, 1);
    if (g === "canceled") {
      if (p.paymentStatus === "REFUNDED") payments.refunded += p.total;
      continue;
    }
    sold++;
    totalAmount += p.total;
    amount.add(p.createdAt, p.total);
    payments[p.paymentStatus === "PAID" ? "paid" : p.paymentStatus === "REFUNDED" ? "refunded" : "unpaid"] += p.total;
  }

  const n = orderNumberOf(params.q);
  const filtered = parts.filter((p) => (!params.status || ORDER_GROUP_STATUSES[params.status].includes(p.status)) && (!params.q || p.order.orderNumber === n));
  return {
    bounds: b,
    hasAnyOrders: !!any,
    storeName: store.storeName,
    totalOrders: parts.length,
    totalAmount,
    avgOrderValue: sold ? Math.round(totalAmount / sold) : 0,
    groups,
    payments,
    chart: { labels: b.buckets.map((x) => x.label), amount: amount.values, orders: orders.values },
    table: paginate(
      filtered.map((p) => ({
        id: p.id,
        orderNumber: p.order.orderNumber,
        createdAt: p.createdAt,
        total: p.total,
        productDiscount: null,
        couponDiscount: p.discount,
        shipping: p.shipping,
        tax: p.tax,
        commission: p.commission,
        commissionState: commissionState(p.status),
        status: p.status,
      })),
      params.page,
      params.pageSize,
      all,
    ),
  };
}

// ── Product Report ─────────────────────────────────────────────────────────────────────────────

export type StockStatus = "in" | "low" | "out" | "digital";
export type ProductReportRow = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  image: string | null;
  /** current selling price, cents */
  unitPrice: number;
  /** in the range: units sold and what they brought in (after coupons, before tax) */
  soldQty: number;
  revenue: number;
  avgValue: number;
  stock: number;
  stockStatus: StockStatus;
  /** 0–5 with two decimals, null when there are no approved reviews */
  rating: number | null;
  reviewCount: number;
  updatedAt: Date;
};

export type ProductReport = {
  bounds: RangeBounds;
  storeName: string;
  /** every product of the store, by review status */
  totalProducts: number;
  byApproval: { approved: number; pending: number; rejected: number };
  /** in the range */
  totalSales: number;
  unitsSold: number;
  /** coupon discounts given on this store's items (product discounts aren't recorded on orders) */
  discountGiven: number;
  lowStock: number;
  outOfStock: number;
  chart: { labels: string[]; units: number[] };
  /** "all" tab rows (best sellers first) or "stock" tab rows (lowest stock first) */
  table: Paged<ProductReportRow>;
};

export async function getProductReport(vendorId: string, params: ProductReportParams, { now = new Date(), all = false }: ReportOpts = {}): Promise<ProductReport> {
  const b = rangeBounds(params.range, now);
  const soldWhere: Prisma.OrderItemWhereInput = { storeOrder: { vendorId, createdAt: inRange(b), status: { notIn: NOT_SOLD } } };
  const [store, products, perProduct, lines] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { storeName: true } }),
    prisma.product.findMany({
      where: { vendorId },
      select: {
        id: true, name: true, sku: true, slug: true, thumbnail: true, price: true, stock: true, productType: true,
        approvalStatus: true, ratingAvg: true, reviewCount: true, updatedAt: true, variations: { select: { stock: true } },
      },
    }),
    prisma.orderItem.groupBy({ by: ["productId"], where: soldWhere, _sum: { qty: true, lineTotal: true, tax: true, discount: true } }),
    // per-bucket units for the chart
    prisma.orderItem.findMany({ where: soldWhere, select: { qty: true, storeOrder: { select: { createdAt: true } } } }),
  ]);

  const sales = new Map(perProduct.map((r) => [r.productId, r._sum]));
  const units = series(b);
  for (const l of lines) units.add(l.storeOrder.createdAt, l.qty);

  const rows: ProductReportRow[] = products.map((p) => {
    const s = sales.get(p.id);
    const soldQty = s?.qty ?? 0;
    const revenue = (s?.lineTotal ?? 0) - (s?.tax ?? 0); // lineTotal = price × qty − coupon share + tax
    const stock = p.variations.length ? sum(p.variations.map((v) => v.stock)) : p.stock;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      image: p.thumbnail,
      unitPrice: p.price,
      soldQty,
      revenue,
      avgValue: soldQty ? Math.round(revenue / soldQty) : 0,
      stock,
      stockStatus: p.productType === "DIGITAL" ? "digital" : stock === 0 ? "out" : stock < LOW_STOCK ? "low" : "in",
      rating: p.reviewCount ? p.ratingAvg / 100 : null,
      reviewCount: p.reviewCount,
      updatedAt: p.updatedAt,
    };
  });

  const q = params.q.toLowerCase();
  const matched = rows.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q) || (r.sku ?? "").toLowerCase().includes(q)) &&
      // Products Stock: digital products have no stock; the chips narrow to one level.
      (params.tab !== "stock" || (r.stockStatus !== "digital" && (!params.stock || r.stockStatus === params.stock))),
  );
  const STOCK_ORDER: Record<StockStatus, number> = { out: 0, low: 1, in: 2, digital: 3 };
  matched.sort(params.tab === "stock" ? (a, z) => STOCK_ORDER[a.stockStatus] - STOCK_ORDER[z.stockStatus] || a.stock - z.stock : (a, z) => z.soldQty - a.soldQty || z.revenue - a.revenue || a.name.localeCompare(z.name));

  return {
    bounds: b,
    storeName: store.storeName,
    totalProducts: products.length,
    byApproval: {
      approved: products.filter((p) => p.approvalStatus === "APPROVED").length,
      pending: products.filter((p) => p.approvalStatus === "PENDING").length,
      rejected: products.filter((p) => p.approvalStatus === "REJECTED").length,
    },
    totalSales: sum(rows.map((r) => r.revenue)),
    unitsSold: sum(rows.map((r) => r.soldQty)),
    discountGiven: sum(perProduct.map((r) => r._sum.discount ?? 0)),
    lowStock: rows.filter((r) => r.stockStatus === "low").length,
    outOfStock: rows.filter((r) => r.stockStatus === "out").length,
    chart: { labels: b.buckets.map((x) => x.label), units: units.values },
    table: paginate(matched, params.page, params.pageSize, all),
  };
}

// ── Transactions Report ────────────────────────────────────────────────────────────────────────

export type OrderTransactionRow = {
  id: string;
  orderNumber: number;
  createdAt: Date;
  customer: string;
  units: number;
  /** items at the price paid (after the product's own discount) */
  amount: number;
  productDiscount: null;
  couponDiscount: number;
  /** amount − coupon */
  discountedAmount: number;
  tax: number;
  shipping: number;
  /** what the buyer pays for this store's part */
  orderAmount: number;
  payment: PaymentStatus;
  status: OrderStatus;
};

export type ExpenseType = "COMMISSION" | "COUPON";
/** `createdAt` = the day the expense was incurred: the part's delivery date. */
export type ExpenseRow = { xid: string; storeOrderId: string; orderNumber: number; createdAt: Date; type: ExpenseType; amount: number };

export type TransactionReport = {
  bounds: RangeBounds;
  storeName: string;
  /** the store ever had an order (false → "No transactions yet") */
  hasAnyOrders: boolean;
  /** order transactions = this store's parts that weren't canceled (a canceled part never took money) */
  counts: { total: number; completed: number; pending: number; refunded: number };
  /**
   * Realized = delivered parts: items after coupon, minus the commission charged on them.
   * Pending = parts still on their way: the same, with the commission as an estimate.
   * Returned / not delivered parts earn nothing; `refunded` is what went back to buyers.
   */
  earnings: {
    realized: { gross: number; commission: number; net: number };
    pending: { gross: number; commission: number; net: number };
    refunded: number;
    tax: number;
    shipping: number;
  };
  /** realized expenses only (delivered parts); `pendingCommission` is the estimate still to come */
  expenses: { total: number; commission: number; coupon: number; productDiscount: null; pendingCommission: number };
  /** filter options: the buyers in this range */
  customers: { id: string; name: string }[];
  chart: { labels: string[]; amount: number[]; expense: number[] };
  /** donut: order amount by payment status */
  paymentSplit: { paid: number; unpaid: number; refunded: number };
  orders: Paged<OrderTransactionRow> | null;
  expenseRows: Paged<ExpenseRow> | null;
};

const ONGOING = ORDER_GROUP_STATUSES.ongoing;

export async function getTransactionReport(vendorId: string, params: TransactionReportParams, { now = new Date(), all = false }: ReportOpts = {}): Promise<TransactionReport> {
  const b = rangeBounds(params.range, now);
  const [inRangeParts, deliveredParts, any, store] = await Promise.all([
    partsInRange(vendorId, b),
    // Earnings + expenses count on the delivery date (commission is charged then) — lib/delivery.server.
    prisma.storeOrder.findMany({ where: { vendorId, ...deliveredBetween(inRange(b)) }, select: { ...PART_SELECT, ...DELIVERY_SELECT } }),
    prisma.storeOrder.findFirst({ where: { vendorId }, select: { id: true } }),
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId }, select: { storeName: true } }),
  ]);
  const parts = inRangeParts.filter((p) => p.status !== "CANCELED");
  const delivered = deliveredParts.map((p) => ({ ...p, at: deliveredAt(p) })).filter((p) => p.at >= b.from && p.at < b.to);
  const ongoing = parts.filter((p) => ONGOING.includes(p.status));

  const amount = series(b), expense = series(b);
  const split = { paid: 0, unpaid: 0, refunded: 0 };
  const customers = new Map<string, string>();
  for (const p of parts) {
    amount.add(p.createdAt, p.total);
    split[p.paymentStatus === "PAID" ? "paid" : p.paymentStatus === "REFUNDED" ? "refunded" : "unpaid"] += p.total;
    customers.set(p.order.customerId, customerName(p));
  }
  // Expenses actually incurred: commission charged and coupons funded on parts delivered in the range, dated
  // on their delivery day.
  const expenseRows: ExpenseRow[] = [];
  for (const p of delivered) {
    expense.add(p.at, p.commission + p.discount);
    if (p.commission > 0) expenseRows.push({ xid: `${p.order.orderNumber}-COM`, storeOrderId: p.id, orderNumber: p.order.orderNumber, createdAt: p.at, type: "COMMISSION", amount: p.commission });
    if (p.discount > 0) expenseRows.push({ xid: `${p.order.orderNumber}-CPN`, storeOrderId: p.id, orderNumber: p.order.orderNumber, createdAt: p.at, type: "COUPON", amount: p.discount });
  }
  expenseRows.sort((a, z) => z.createdAt.getTime() - a.createdAt.getTime());

  const earned = (xs: PartRow[]) => {
    const gross = sum(xs.map((p) => p.subtotal - p.discount));
    const commission = sum(xs.map((p) => p.commission));
    return { gross, commission, net: gross - commission };
  };
  const realized = earned(delivered);
  const pending = earned(ongoing);
  const coupon = sum(delivered.map((p) => p.discount));
  const n = orderNumberOf(params.q);
  const ql = params.q.toLowerCase();

  const orderRows = parts
    .filter((p) => (!params.payment || p.paymentStatus === PAYMENT_OF[params.payment]) && (!params.customer || p.order.customerId === params.customer))
    .filter((p) => !params.q || p.order.orderNumber === n || customerName(p).toLowerCase().includes(ql))
    .map((p) => ({
      id: p.id,
      orderNumber: p.order.orderNumber,
      createdAt: p.createdAt,
      customer: customerName(p),
      units: sum(p.items.map((i) => i.qty)),
      amount: p.subtotal,
      productDiscount: null,
      couponDiscount: p.discount,
      discountedAmount: p.subtotal - p.discount,
      tax: p.tax,
      shipping: p.shipping,
      orderAmount: p.total,
      payment: p.paymentStatus,
      status: p.status,
    }));
  const expenseMatched = expenseRows.filter((e) => !params.q || e.orderNumber === n || e.xid.toLowerCase().includes(ql));

  return {
    bounds: b,
    storeName: store.storeName,
    hasAnyOrders: !!any,
    counts: {
      total: parts.length,
      completed: parts.filter((p) => p.paymentStatus === "PAID").length,
      pending: parts.filter((p) => p.paymentStatus === "UNPAID").length,
      refunded: parts.filter((p) => p.paymentStatus === "REFUNDED").length,
    },
    earnings: {
      realized,
      pending,
      refunded: sum(parts.filter((p) => p.paymentStatus === "REFUNDED").map((p) => p.total)),
      tax: sum(delivered.map((p) => p.tax)),
      shipping: sum(delivered.map((p) => p.shipping)),
    },
    expenses: { total: realized.commission + coupon, commission: realized.commission, coupon, productDiscount: null, pendingCommission: pending.commission },
    customers: [...customers].map(([id, name]) => ({ id, name })).sort((a, z) => a.name.localeCompare(z.name)),
    chart: { labels: b.buckets.map((x) => x.label), amount: amount.values, expense: expense.values },
    paymentSplit: split,
    orders: params.tab === "orders" ? paginate(orderRows, params.page, params.pageSize, all) : null,
    expenseRows: params.tab === "expenses" ? paginate(expenseMatched, params.page, params.pageSize, all) : null,
  };
}
