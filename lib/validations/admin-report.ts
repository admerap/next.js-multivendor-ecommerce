import { z } from "zod";
import { LOW_STOCK } from "@/lib/validations/product";

/**
 * Admin › Report Manage URL params (admin*report designs). Everything lives in the URL, so a report can be
 * refreshed or shared; anything unknown falls back to the default. Platform-wide: no vendor scoping.
 */

/** The designs' date presets — the vendor reports' three plus Last year. */
export const ADMIN_REPORT_RANGES = ["year", "lastyear", "month", "week"] as const;
export type AdminReportRange = (typeof ADMIN_REPORT_RANGES)[number];
export const ADMIN_REPORT_RANGE_LABEL: Record<AdminReportRange, string> = { year: "This year", lastyear: "Last year", month: "This month", week: "This week" };

const id = z.string().trim().regex(/^[a-z0-9]{1,40}$/i);
const base = {
  range: z.enum(ADMIN_REPORT_RANGES).catch("year"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
};
/** ?store=<vendorId> — "All stores" when missing or malformed. */
const store = id.optional().catch(undefined);

// ── Earnings ──────────────────────────────────────────────────────────────────

/** Admin Earning (what Sundry keeps) · Vendor Earning (what stores take home). */
export const EARNING_TABS = ["admin", "vendor"] as const;
export const adminEarningsSchema = z.object({ ...base, tab: z.enum(EARNING_TABS).catch("admin") });
export type AdminEarningsParams = z.infer<typeof adminEarningsSchema>;

// ── Orders ────────────────────────────────────────────────────────────────────

/** The design's three groups (Completed = delivered · Ongoing = on its way · Canceled = canceled / returned / failed). */
export const ADMIN_ORDER_GROUPS = ["completed", "ongoing", "canceled"] as const;
export type AdminOrderGroup = (typeof ADMIN_ORDER_GROUPS)[number];
export const ADMIN_ORDER_GROUP_LABEL: Record<AdminOrderGroup, string> = { completed: "Completed", ongoing: "Ongoing", canceled: "Canceled" };
export const adminOrderReportSchema = z.object({ ...base, store, status: z.enum(ADMIN_ORDER_GROUPS).optional().catch(undefined) });
export type AdminOrderReportParams = z.infer<typeof adminOrderReportSchema>;

// ── Products ──────────────────────────────────────────────────────────────────

/** All Products · Wish Listed Products (Product Stock is its own page, /admin/reports/stock). */
export const PRODUCT_REPORT_TABS = ["all", "wishlist"] as const;
/** Status tiles: approval status, labelled like everywhere else (REJECTED → "Denied"). */
export const PRODUCT_STATUS_FILTERS = ["approved", "pending", "denied"] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];
export const adminProductReportSchema = z.object({
  ...base,
  store,
  tab: z.enum(PRODUCT_REPORT_TABS).catch("all"),
  status: z.enum(PRODUCT_STATUS_FILTERS).optional().catch(undefined),
});
export type AdminProductReportParams = z.infer<typeof adminProductReportSchema>;

// ── Stock ─────────────────────────────────────────────────────────────────────

/** Design thresholds: 0 = Out of stock · under LOW_STOCK (10) = Soon stock out · otherwise In stock. */
export const STOCK_LEVELS = ["out", "low", "in"] as const;
export type StockLevel = (typeof STOCK_LEVELS)[number];
export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = { out: "Out of stock", low: "Soon stock out", in: "In stock" };
export const STOCK_LEVEL_TONE = { out: "error", low: "warning", in: "success" } as const;
export const stockLevel = (stock: number): StockLevel => (stock <= 0 ? "out" : stock < LOW_STOCK ? "low" : "in");

export const STOCK_SORTS = { low: "Low to high", high: "High to low", recent: "Recently updated" } as const;
export type StockSort = keyof typeof STOCK_SORTS;
export const adminStockReportSchema = z.object({
  q: base.q,
  page: base.page,
  pageSize: base.pageSize,
  store,
  category: id.optional().catch(undefined),
  level: z.enum(STOCK_LEVELS).optional().catch(undefined),
  sort: z.enum(Object.keys(STOCK_SORTS) as [StockSort, ...StockSort[]]).catch("low"),
});
export type AdminStockReportParams = z.infer<typeof adminStockReportSchema>;
