import "server-only";

import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma, ProductApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliveredAt, deliveredBetween, DELIVERY_SELECT } from "@/lib/delivery.server";
import { DEFAULT_COMMISSION_BP } from "@/lib/orders.server";
import {
  ADMIN_REPORT_RANGE_LABEL,
  stockLevel,
  type AdminEarningsParams,
  type AdminOrderGroup,
  type AdminOrderReportParams,
  type AdminProductReportParams,
  type AdminReportRange,
  type AdminStockReportParams,
  type ProductStatusFilter,
  type StockLevel,
} from "@/lib/validations/admin-report";
import { rangeBounds, type RangeBounds } from "@/lib/vendor-reports.server";

/**
 * Admin › Report Manage: platform-wide, read-only analytics. Every figure is computed on read from the real
 * orders, products and wishlists — no stored totals, no writes. Callers must check can("reports") first.
 *
 * Shared definitions (the same as the vendor reports, lib/vendor-reports.server.ts, across every store):
 *  - Orders, sales and products count in a range by when they were ordered; EARNINGS (commission, delivery
 *    charges, vendor net) count by when the part was delivered — lib/delivery.server.
 *  - Commission = StoreOrder.commission, fixed when the order was placed from StoreOrder.commissionRate
 *    (today every order uses DEFAULT_COMMISSION_BP = 10%, the PRD default; there's no admin setting yet).
 *    It's only charged once the part is DELIVERED; canceled / returned / failed parts never pay it.
 *  - Sundry delivers, so a delivered part's shipping is Sundry's delivery charge.
 *  - Vendor net = items after the store's coupon (subtotal − discount) − commission.
 *  - "Sold" = the part wasn't CANCELED / RETURNED / FAILED. Product revenue = lineTotal − tax.
 *  - Product discounts aren't recorded on orders (OrderItem keeps the price paid) → null, shown "—".
 *  - Not built yet, so honestly zero / null (TODO): in-house (Sundry Official) store, delivery-man
 *    incentives, platform-funded discounts, vendor payouts (Stripe Connect), Stripe payments, refunds flow.
 */

const ONGOING: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY"];
const NOT_SOLD: OrderStatus[] = ["CANCELED", "RETURNED", "FAILED"];
export const ADMIN_ORDER_GROUP_STATUSES: Record<AdminOrderGroup, OrderStatus[]> = { completed: ["DELIVERED"], ongoing: ONGOING, canceled: NOT_SOLD };
const groupOf = (s: OrderStatus): AdminOrderGroup => (s === "DELIVERED" ? "completed" : ONGOING.includes(s) ? "ongoing" : "canceled");

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** `now`: the reference date (tests); `all`: every matching row in one page (exports). */
export type AdminReportOpts = { now?: Date; all?: boolean };

/** Page `rows` (1-based; an out-of-range page lands on the last one); `all` returns them in one page. */
function paginate<T>(rows: T[], page: number, size: number, all = false) {
  const pageSize = all ? Math.max(1, rows.length) : size;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), total: rows.length, page: current, pageSize, pageCount };
}
export type AdminPaged<T> = ReturnType<typeof paginate<T>>;

// ── Date ranges ───────────────────────────────────────────────────────────────

export type AdminBounds = RangeBounds & { key: AdminReportRange; label: string };

/** The vendor reports' windows (server local time), plus Last year = the previous calendar year by month. */
export function adminRangeBounds(range: AdminReportRange, now = new Date()): AdminBounds {
  const b = range === "lastyear" ? rangeBounds("year", new Date(now.getFullYear() - 1, 6, 1)) : rangeBounds(range, now);
  return { ...b, key: range, label: range === "lastyear" ? `in ${now.getFullYear() - 1}` : ADMIN_REPORT_RANGE_LABEL[range].toLowerCase() };
}
const inRange = (b: RangeBounds) => ({ gte: b.from, lt: b.to });
const bucketOf = (b: RangeBounds, d: Date) => b.buckets.findIndex((x) => d >= x.start && d < x.end);
/** One zeroed number per bucket, then `add(date, n)` puts n in the right one. */
function series(b: RangeBounds) {
  const values = b.buckets.map(() => 0);
  return {
    values,
    add: (d: Date, n: number) => {
      const i = bucketOf(b, d);
      if (i >= 0) values[i]! += n;
    },
  };
}

/** Every store, A→Z — for the "Select seller" filters. */
const storeOptions = () => prisma.vendor.findMany({ select: { id: true, storeName: true }, orderBy: { storeName: "asc" } }).then((xs) => xs.map((s) => ({ id: s.id, name: s.storeName })));
/** The seller filter, only if it names a real store — an unknown id falls back to All stores. */
const knownStore = (stores: { id: string }[], id?: string) => (id && stores.some((s) => s.id === id) ? id : undefined);

// ── Earnings ──────────────────────────────────────────────────────────────────

export type EarningBucketRow = {
  label: string;
  inHouse: number;
  commission: number;
  shipping: number;
  /** TODO(delivery-men): no delivery-man incentives yet */
  incentive: number;
  /** discounts Sundry itself funded — every coupon today is a vendor coupon, so 0 */
  discount: number;
  /** tax collected on delivered parts (passed on, not earned — shown, not added) */
  tax: number;
  /** TODO(refunds): REFUNDED payments, once the refund flow exists */
  refunds: number;
  /** inHouse + commission + shipping − incentive − discount − refunds */
  total: number;
};
export type VendorEarningRow = {
  vendorId: string;
  store: string;
  logo: string | null;
  /** delivered parts in the range */
  orders: number;
  /** items after the store's coupon */
  gross: number;
  commission: number;
  shipping: number;
  net: number;
  /** TODO(stripe-connect): payouts aren't built — null renders "—" */
  withdrawn: null;
  /** what Sundry owes the store for these parts (= net until payouts exist) */
  balance: number;
};
export type AdminEarnings = {
  bounds: AdminBounds;
  /** the commission rates actually applied to the parts counted, in basis points (today: [1000]) */
  commissionRates: number[];
  defaultCommissionRate: number;
  admin: {
    total: number;
    commission: number;
    inHouse: number;
    shipping: number;
    tax: number;
    refunds: number;
    rows: EarningBucketRow[];
    inHouseProducts: number;
    /** estimates on parts ordered in the range and still on their way: earned once delivered */
    pending: { commission: number; shipping: number; orders: number };
  };
  vendor: {
    net: number;
    gross: number;
    commission: number;
    withdrawn: null;
    vendorProducts: number;
    chart: { net: number[]; commission: number[] };
    rows: AdminPaged<VendorEarningRow>;
    /** stores' estimated net on the same on-the-way parts */
    pending: { net: number; orders: number };
  };
  shops: number;
  /** payments received in the range (by the day they were collected): COD · Stripe (TODO) · refunded */
  payments: { cod: number; stripe: number; refunded: number };
  /** anything at all in range — earned, pending or paid (empty state) */
  hasData: boolean;
};

const EARNING_SELECT = {
  status: true, subtotal: true, discount: true, shipping: true, tax: true, commission: true, commissionRate: true,
  vendor: { select: { id: true, storeName: true, logo: true } },
  ...DELIVERY_SELECT,
} satisfies Prisma.StoreOrderSelect;

/**
 * Earnings count on the day a part was DELIVERED (that's when the commission is charged — lib/delivery.server),
 * not the day it was ordered. Pending = parts ordered in the range that are still on their way.
 */
export async function getAdminEarnings(params: AdminEarningsParams, { now = new Date(), all = false }: AdminReportOpts = {}): Promise<AdminEarnings> {
  const b = adminRangeBounds(params.range, now);
  const [deliveredParts, ongoing, payments, shops, vendorProducts] = await Promise.all([
    prisma.storeOrder.findMany({ where: deliveredBetween(inRange(b)), select: EARNING_SELECT }),
    prisma.storeOrder.findMany({ where: { status: { in: ONGOING }, createdAt: inRange(b) }, select: { subtotal: true, discount: true, shipping: true, commission: true, commissionRate: true } }),
    prisma.storeOrder.findMany({
      where: { OR: [{ paymentStatus: "PAID", paidAt: inRange(b) }, { paymentStatus: "REFUNDED", createdAt: inRange(b) }] },
      select: { paymentStatus: true, total: true, order: { select: { paymentMethod: true } } },
    }),
    prisma.vendor.count(),
    prisma.product.count(),
  ]);

  // The latest DELIVERED event decides (a part re-delivered later counts once, on its last delivery).
  const delivered = deliveredParts.map((p) => ({ ...p, at: deliveredAt(p) })).filter((p) => p.at >= b.from && p.at < b.to);
  const com = series(b), shp = series(b), tax = series(b), net = series(b);
  const byStore = new Map<string, VendorEarningRow>();
  for (const p of delivered) {
    const n = p.subtotal - p.discount - p.commission;
    com.add(p.at, p.commission);
    shp.add(p.at, p.shipping);
    tax.add(p.at, p.tax);
    net.add(p.at, n);
    const row = byStore.get(p.vendor.id) ?? { vendorId: p.vendor.id, store: p.vendor.storeName, logo: p.vendor.logo, orders: 0, gross: 0, commission: 0, shipping: 0, net: 0, withdrawn: null, balance: 0 };
    row.orders++;
    row.gross += p.subtotal - p.discount;
    row.commission += p.commission;
    row.shipping += p.shipping;
    row.net += n;
    row.balance += n;
    byStore.set(p.vendor.id, row);
  }

  const rows: EarningBucketRow[] = b.buckets.map((bucket, i) => {
    const commission = com.values[i]!, shipping = shp.values[i]!;
    return { label: bucket.label, inHouse: 0, commission, shipping, incentive: 0, discount: 0, tax: tax.values[i]!, refunds: 0, total: commission + shipping };
  });
  const q = params.q.toLowerCase();
  const vendorRows = [...byStore.values()].filter((r) => !q || r.store.toLowerCase().includes(q)).sort((a, z) => z.net - a.net || a.store.localeCompare(z.store));
  const paid = (m: PaymentMethod) => sum(payments.filter((p) => p.paymentStatus === "PAID" && p.order.paymentMethod === m).map((p) => p.total));

  return {
    bounds: b,
    commissionRates: [...new Set([...delivered, ...ongoing].map((p) => p.commissionRate))].sort((a, z) => a - z),
    defaultCommissionRate: DEFAULT_COMMISSION_BP,
    admin: {
      total: sum(rows.map((r) => r.total)),
      commission: sum(com.values),
      inHouse: 0,
      shipping: sum(shp.values),
      tax: sum(tax.values),
      refunds: 0,
      rows,
      inHouseProducts: 0,
      pending: { commission: sum(ongoing.map((p) => p.commission)), shipping: sum(ongoing.map((p) => p.shipping)), orders: ongoing.length },
    },
    vendor: {
      net: sum(net.values),
      gross: sum(delivered.map((p) => p.subtotal - p.discount)),
      commission: sum(com.values),
      withdrawn: null,
      vendorProducts,
      chart: { net: net.values, commission: com.values },
      rows: paginate(vendorRows, params.page, params.pageSize, all),
      pending: { net: sum(ongoing.map((p) => p.subtotal - p.discount - p.commission)), orders: ongoing.length },
    },
    shops,
    payments: { cod: paid("COD"), stripe: paid("STRIPE"), refunded: sum(payments.filter((p) => p.paymentStatus === "REFUNDED").map((p) => p.total)) },
    hasData: delivered.length > 0 || ongoing.length > 0 || payments.length > 0,
  };
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type AdminOrderReportRow = {
  id: string;
  orderNumber: number;
  store: string;
  vendorId: string;
  createdAt: Date;
  /** what the buyer pays for this store's part */
  total: number;
  /** still to collect (unpaid, not canceled) */
  due: number;
  /** a returned part's amount */
  returned: number;
  /** not recorded on orders → null, shown "—" */
  productDiscount: null;
  couponDiscount: number;
  shipping: number;
  status: OrderStatus;
  group: AdminOrderGroup;
  paymentStatus: PaymentStatus;
};
export type AdminOrderReport = {
  bounds: AdminBounds;
  stores: { id: string; name: string }[];
  /** the seller filter actually applied (undefined = all stores, incl. an unknown id) */
  store?: string;
  /** store parts in range (one row per store in each order), for the chosen seller */
  counts: Record<AdminOrderGroup | "total", number>;
  /**
   * sales = what buyers pay for parts that weren't canceled / returned / failed · lost = those that were ·
   * orders = distinct customer orders with a sold part · avgOrder = sales ÷ orders (all for the seller filter)
   */
  amounts: { sales: number; lost: number; orders: number; avgOrder: number };
  dueAmount: number;
  settledAmount: number;
  chart: { settled: number[]; due: number[] };
  payments: { cod: number; stripe: number; refunded: number };
  table: AdminPaged<AdminOrderReportRow>;
  hasData: boolean;
  /** any order on the platform at all (first-run empty state vs. an empty range) */
  hasAnyOrders: boolean;
};

export async function getAdminOrderReport(params: AdminOrderReportParams, { now = new Date(), all = false }: AdminReportOpts = {}): Promise<AdminOrderReport> {
  const b = adminRangeBounds(params.range, now);
  const stores = await storeOptions();
  const store = knownStore(stores, params.store);
  const [parts, any] = await Promise.all([
    prisma.storeOrder.findMany({
      where: { createdAt: inRange(b), ...(store && { vendorId: store }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, createdAt: true, status: true, paymentStatus: true, discount: true, shipping: true, total: true,
        order: { select: { orderNumber: true, paymentMethod: true } },
        vendor: { select: { id: true, storeName: true } },
      },
    }),
    prisma.storeOrder.findFirst({ select: { id: true } }),
  ]);

  const settled = series(b), due = series(b);
  const rows: AdminOrderReportRow[] = parts.map((p) => {
    const group = groupOf(p.status);
    const owed = p.paymentStatus === "UNPAID" && group === "ongoing" ? p.total : 0;
    if (p.paymentStatus === "PAID") settled.add(p.createdAt, p.total);
    due.add(p.createdAt, owed);
    return {
      id: p.id,
      orderNumber: p.order.orderNumber,
      store: p.vendor.storeName,
      vendorId: p.vendor.id,
      createdAt: p.createdAt,
      total: p.total,
      due: owed,
      returned: p.status === "RETURNED" ? p.total : 0,
      productDiscount: null,
      couponDiscount: p.discount,
      shipping: p.shipping,
      status: p.status,
      group,
      paymentStatus: p.paymentStatus,
    };
  });

  const counts = { total: rows.length, completed: 0, ongoing: 0, canceled: 0 };
  for (const r of rows) counts[r.group]++;
  const sold = rows.filter((r) => r.group !== "canceled");
  const sales = sum(sold.map((r) => r.total));
  const soldOrders = new Set(sold.map((r) => r.orderNumber)).size;
  const amounts = { sales, lost: sum(rows.filter((r) => r.group === "canceled").map((r) => r.total)), orders: soldOrders, avgOrder: soldOrders ? Math.round(sales / soldOrders) : 0 };
  const n = /^#?\d{1,10}$/.test(params.q) ? Number(params.q.replace("#", "")) : null;
  const q = params.q.toLowerCase();
  const matched = rows.filter((r) => (!params.status || r.group === params.status) && (!q || r.orderNumber === n || r.store.toLowerCase().includes(q)));
  const paid = (m: PaymentMethod) => sum(parts.filter((p) => p.paymentStatus === "PAID" && p.order.paymentMethod === m).map((p) => p.total));

  return {
    bounds: b,
    stores,
    store,
    counts,
    amounts,
    dueAmount: sum(due.values),
    settledAmount: sum(settled.values),
    chart: { settled: settled.values, due: due.values },
    payments: { cod: paid("COD"), stripe: paid("STRIPE"), refunded: sum(parts.filter((p) => p.paymentStatus === "REFUNDED").map((p) => p.total)) },
    table: paginate(matched, params.page, params.pageSize, all),
    hasData: parts.length > 0,
    hasAnyOrders: !!any,
  };
}

// ── Products ──────────────────────────────────────────────────────────────────

const APPROVAL_OF: Record<ProductStatusFilter, ProductApprovalStatus> = { approved: "APPROVED", pending: "PENDING", denied: "REJECTED" };
/** A product's stock: the sum of its variations when it has any. Digital products have none (null). */
const stockOf = (p: { productType: string; stock: number; variations: { stock: number }[] }) =>
  p.productType === "DIGITAL" ? null : p.variations.length ? sum(p.variations.map((v) => v.stock)) : p.stock;

export type AdminProductReportRow = {
  id: string;
  name: string;
  image: string | null;
  store: string;
  vendorId: string;
  category: string;
  unitPrice: number;
  /** in the range: what it brought in (after coupons, before tax), units, and their average */
  revenue: number;
  soldQty: number;
  avgValue: number | null;
  /** null for digital products */
  stock: number | null;
  level: StockLevel | null;
  approvalStatus: ProductApprovalStatus;
  wishlisted: number;
};
/** One line of a sales breakdown: how many products, units and how much they sold (after coupons, before tax). */
export type SalesGroup = { id: string; name: string; products: number; units: number; revenue: number };

export type AdminProductReport = {
  bounds: AdminBounds;
  stores: { id: string; name: string }[];
  /** the seller filter actually applied (undefined = all stores, incl. an unknown id) */
  store?: string;
  totalProducts: number;
  byApproval: Record<ProductStatusFilter, number>;
  unitsSold: number;
  /** coupon discounts on the items in range (product discounts aren't recorded on orders) */
  discountGiven: number;
  chart: { units: number[]; revenue: number[] };
  /** sales in the range grouped by category and by store (all products under the seller filter), best first */
  breakdown: { categories: SalesGroup[]; stores: SalesGroup[] };
  /** "all" tab: best sellers first · "wishlist" tab: only wishlisted products, most saved first */
  table: AdminPaged<AdminProductReportRow>;
  hasData: boolean;
};

export async function getAdminProductReport(params: AdminProductReportParams, { now = new Date(), all = false }: AdminReportOpts = {}): Promise<AdminProductReport> {
  const b = adminRangeBounds(params.range, now);
  const stores = await storeOptions();
  const store = knownStore(stores, params.store);
  const scope: Prisma.ProductWhereInput = store ? { vendorId: store } : {};
  const soldWhere: Prisma.OrderItemWhereInput = { storeOrder: { createdAt: inRange(b), status: { notIn: NOT_SOLD }, ...(store && { vendorId: store }) } };
  const [products, perProduct, lines, wishes] = await Promise.all([
    prisma.product.findMany({
      where: scope,
      select: {
        id: true, name: true, thumbnail: true, price: true, stock: true, productType: true, approvalStatus: true,
        vendor: { select: { id: true, storeName: true } }, variations: { select: { stock: true } }, category: { select: { id: true, name: true } },
      },
    }),
    prisma.orderItem.groupBy({ by: ["productId"], where: soldWhere, _sum: { qty: true, lineTotal: true, tax: true, discount: true } }),
    prisma.orderItem.findMany({ where: soldWhere, select: { qty: true, lineTotal: true, tax: true, storeOrder: { select: { createdAt: true } } } }),
    prisma.wishlistItem.groupBy({ by: ["productId"], where: { product: scope }, _count: { _all: true } }),
  ]);

  const sales = new Map(perProduct.map((r) => [r.productId, r._sum]));
  const wished = new Map(wishes.map((w) => [w.productId, w._count._all]));
  const units = series(b), revenue = series(b);
  for (const l of lines) {
    units.add(l.storeOrder.createdAt, l.qty);
    revenue.add(l.storeOrder.createdAt, l.lineTotal - l.tax);
  }

  const rows: AdminProductReportRow[] = products.map((p) => {
    const s = sales.get(p.id);
    const soldQty = s?.qty ?? 0;
    const rev = (s?.lineTotal ?? 0) - (s?.tax ?? 0);
    const stock = stockOf(p);
    return {
      id: p.id,
      name: p.name,
      image: p.thumbnail,
      store: p.vendor.storeName,
      vendorId: p.vendor.id,
      category: p.category.name,
      unitPrice: p.price,
      revenue: rev,
      soldQty,
      avgValue: soldQty ? Math.round(rev / soldQty) : null,
      stock,
      level: stock === null ? null : stockLevel(stock),
      approvalStatus: p.approvalStatus,
      wishlisted: wished.get(p.id) ?? 0,
    };
  });

  // Breakdowns: every product under the seller filter (not the search / status / tab), grouped.
  const group = (key: (i: number) => { id: string; name: string }) => {
    const m = new Map<string, SalesGroup>();
    rows.forEach((r, i) => {
      const k = key(i);
      const g = m.get(k.id) ?? { id: k.id, name: k.name, products: 0, units: 0, revenue: 0 };
      g.products++;
      g.units += r.soldQty;
      g.revenue += r.revenue;
      m.set(k.id, g);
    });
    return [...m.values()].sort((a, z) => z.revenue - a.revenue || z.units - a.units || a.name.localeCompare(z.name));
  };
  const breakdown = {
    categories: group((i) => products[i]!.category),
    stores: group((i) => ({ id: products[i]!.vendor.id, name: products[i]!.vendor.storeName })),
  };

  const q = params.q.toLowerCase();
  const matched = rows.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q) || r.store.toLowerCase().includes(q)) &&
      (!params.status || r.approvalStatus === APPROVAL_OF[params.status]) &&
      (params.tab !== "wishlist" || r.wishlisted > 0),
  );
  matched.sort(
    params.tab === "wishlist"
      ? (a, z) => z.wishlisted - a.wishlisted || a.name.localeCompare(z.name)
      : (a, z) => z.soldQty - a.soldQty || z.revenue - a.revenue || a.name.localeCompare(z.name),
  );

  return {
    bounds: b,
    stores,
    store,
    totalProducts: products.length,
    byApproval: {
      approved: products.filter((p) => p.approvalStatus === "APPROVED").length,
      pending: products.filter((p) => p.approvalStatus === "PENDING").length,
      denied: products.filter((p) => p.approvalStatus === "REJECTED").length,
    },
    unitsSold: sum(rows.map((r) => r.soldQty)),
    discountGiven: sum(perProduct.map((r) => r._sum.discount ?? 0)),
    chart: { units: units.values, revenue: revenue.values },
    breakdown,
    table: paginate(matched, params.page, params.pageSize, all),
    hasData: products.length > 0,
  };
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export type AdminStockRow = {
  id: string;
  name: string;
  image: string | null;
  store: string;
  vendorId: string;
  category: string;
  /** the latest change to the product or any of its variations */
  updatedAt: Date;
  stock: number;
  level: StockLevel;
  hasVariations: boolean;
  /** variations sold out / running low (under LOW_STOCK) — a product can look fine in total while a size is gone */
  variationsOut: string[];
  variationsLow: string[];
};
export type AdminStockReport = {
  stores: { id: string; name: string }[];
  /** the seller filter actually applied (undefined = all stores, incl. an unknown id) */
  store?: string;
  categories: { id: string; name: string }[];
  category?: string;
  /** for the chips: counts before the level filter (after store / category / search) */
  counts: Record<StockLevel | "all", number>;
  /** products whose total looks fine but with at least one variation sold out (same scope as counts) */
  variationAlerts: number;
  table: AdminPaged<AdminStockRow>;
  /** any physical product at all (empty state) */
  hasData: boolean;
};

/** Live inventory across every store — current state, not date-ranged. Digital products have no stock and are left out. */
export async function getAdminStockReport(params: AdminStockReportParams, { all = false }: AdminReportOpts = {}): Promise<AdminStockReport> {
  const [products, stores, categories] = await Promise.all([
    prisma.product.findMany({
      where: { productType: { not: "DIGITAL" } },
      select: {
        id: true, name: true, thumbnail: true, stock: true, updatedAt: true,
        vendor: { select: { id: true, storeName: true } }, category: { select: { id: true, name: true } },
        variations: { select: { name: true, stock: true, updatedAt: true }, orderBy: { position: "asc" } },
      },
    }),
    storeOptions(),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const store = knownStore(stores, params.store);
  const category = params.category && categories.some((c) => c.id === params.category) ? params.category : undefined;
  const q = params.q.toLowerCase();
  const scoped: AdminStockRow[] = products
    .filter((p) => (!store || p.vendor.id === store) && (!category || p.category.id === category) && (!q || p.name.toLowerCase().includes(q)))
    .map((p) => {
      const stock = p.variations.length ? sum(p.variations.map((v) => v.stock)) : p.stock;
      const updatedAt = new Date(Math.max(p.updatedAt.getTime(), ...p.variations.map((v) => v.updatedAt.getTime())));
      return {
        id: p.id, name: p.name, image: p.thumbnail, store: p.vendor.storeName, vendorId: p.vendor.id, category: p.category.name, updatedAt, stock, level: stockLevel(stock),
        hasVariations: p.variations.length > 0,
        variationsOut: p.variations.filter((v) => v.stock <= 0).map((v) => v.name),
        variationsLow: p.variations.filter((v) => stockLevel(v.stock) === "low").map((v) => v.name),
      };
    });

  const counts = { all: scoped.length, out: 0, low: 0, in: 0 };
  for (const r of scoped) counts[r.level]++;
  const variationAlerts = scoped.filter((r) => r.level !== "out" && r.variationsOut.length > 0).length;
  const matched = scoped.filter((r) => !params.level || r.level === params.level);
  const SORTS: Record<AdminStockReportParams["sort"], (a: AdminStockRow, z: AdminStockRow) => number> = {
    low: (a, z) => a.stock - z.stock || a.name.localeCompare(z.name),
    high: (a, z) => z.stock - a.stock || a.name.localeCompare(z.name),
    recent: (a, z) => z.updatedAt.getTime() - a.updatedAt.getTime(),
  };
  matched.sort(SORTS[params.sort]);

  return { stores, store, categories, category, counts, variationAlerts, table: paginate(matched, params.page, params.pageSize, all), hasData: products.length > 0 };
}
