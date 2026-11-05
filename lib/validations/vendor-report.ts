import { z } from "zod";

/**
 * Seller Center › Report Manage URL params (vendor*report designs). Everything lives in the URL, so a
 * report can be refreshed or shared; anything unknown falls back to the default.
 */

/** The designs' date presets: This year (by month) · This month (by week) · This week (by day). */
export const REPORT_RANGES = ["year", "month", "week"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const REPORT_RANGE_LABEL: Record<ReportRange, string> = { year: "This year", month: "This month", week: "This week" };

/** Order Report status filter: the design's three groups. */
export const ORDER_GROUPS = ["completed", "ongoing", "canceled"] as const;
export type OrderGroup = (typeof ORDER_GROUPS)[number];

/** Transactions Report payment filter (Completed = PAID, Pending = UNPAID, Refunded = REFUNDED). */
export const PAYMENT_FILTERS = ["completed", "pending", "refunded"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

const base = {
  range: z.enum(REPORT_RANGES).catch("year"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
};

export const orderReportSchema = z.object({ ...base, status: z.enum(ORDER_GROUPS).optional().catch(undefined) });
export type OrderReportParams = z.infer<typeof orderReportSchema>;

/** Transactions Report › Expense Transactions types (commission charged, coupons the store funded). */
export const EXPENSE_LABEL = { COMMISSION: "Commission", COUPON: "Coupon discount" } as const;

/** A product's stock level in the report (digital products have none). */
export const STOCK_LABEL = { in: "In stock", low: "Low stock", out: "Out of stock", digital: "Digital" } as const;

/** Products Stock tab chips (All = no param). */
export const STOCK_FILTERS = ["in", "low", "out"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export const productReportSchema = z.object({
  ...base,
  tab: z.enum(["all", "stock"]).catch("all"),
  stock: z.enum(STOCK_FILTERS).optional().catch(undefined),
});
export type ProductReportParams = z.infer<typeof productReportSchema>;

export const transactionReportSchema = z.object({
  ...base,
  tab: z.enum(["orders", "expenses"]).catch("orders"),
  payment: z.enum(PAYMENT_FILTERS).optional().catch(undefined),
  /** a customer's user id (from the filter's own options) */
  customer: z.string().regex(/^[a-z0-9]{1,40}$/i).optional().catch(undefined),
});
export type TransactionReportParams = z.infer<typeof transactionReportSchema>;
