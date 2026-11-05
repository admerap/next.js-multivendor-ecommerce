import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { money } from "@/lib/money";
import { PAYMENT_REPORT_LABEL } from "@/lib/orders";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { EXPENSE_LABEL, REPORT_RANGE_LABEL, transactionReportSchema } from "@/lib/validations/vendor-report";
import { currentVendorId } from "@/lib/vendor-auth";
import { getTransactionReport } from "@/lib/vendor-reports.server";

const PAYMENT_FILTER = { completed: "Completed", pending: "Pending", refunded: "Refunded" } as const;

/**
 * GET /api/vendor/reports/transactions/export?format=csv|pdf&range=&tab=&payment=&customer=&q= —
 * Transactions Report › Export: the current tab's rows (all pages) for the signed-in store only.
 * Order rows are real COD orders; expense rows are commission / coupons of delivered orders. No payouts
 * are exported: they don't exist until Stripe Connect.
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return NextResponse.redirect(new URL(`/vendor/login?callbackUrl=${encodeURIComponent("/vendor/reports/transactions")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = transactionReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getTransactionReport(vendorId, params, { all: true });
    const expenses = params.tab === "expenses";
    const name = `sundry-${expenses ? "expense" : "order"}-transactions-${params.range}-${isoDate(new Date())}`;
    const customer = params.customer && r.customers.find((c) => c.id === params.customer)?.name;

    if (format === "csv") {
      const csv = expenses
        ? toCsv(["XID", "Date", "Order ID", "Expense Type", "Expense Amount (USD)"], r.expenseRows!.rows.map((x) => [x.xid, isoDate(x.createdAt), `#${x.orderNumber}`, EXPENSE_LABEL[x.type], csvDollars(x.amount)]))
        : toCsv(
            ["Order ID", "Date", "Customer", "Items", "Product Amount (USD)", "Product Discount", "Coupon Discount (USD)", "Discounted Amount (USD)", "VAT/Tax (USD)", "Shipping (USD)", "Order Amount (USD)", "Payment"],
            r.orders!.rows.map((x) => [`#${x.orderNumber}`, isoDate(x.createdAt), x.customer, x.units, csvDollars(x.amount), "Not recorded", csvDollars(x.couponDiscount), csvDollars(x.discountedAmount), csvDollars(x.tax), csvDollars(x.shipping), csvDollars(x.orderAmount), PAYMENT_REPORT_LABEL[x.payment]]),
          );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }

    const subtitle = [REPORT_RANGE_LABEL[params.range], !expenses && params.payment && `Payment: ${PAYMENT_FILTER[params.payment]}`, !expenses && customer && `Customer: ${customer}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · ");
    const pdf = expenses
      ? await renderReportPdf({
          title: "Expense Transactions",
          store: r.storeName,
          subtitle,
          summary: [
            ["Total expense", money(r.expenses.total)],
            ["Commission charged", money(r.expenses.commission)],
            ["Coupon discounts", money(r.expenses.coupon)],
            ["Pending commission (est.)", money(r.expenses.pendingCommission)],
          ],
          columns: [
            { label: "XID", weight: 1.3 },
            { label: "Date", weight: 1.1 },
            { label: "Order ID", weight: 1.1 },
            { label: "Expense type", weight: 1.6 },
            { label: "Amount", weight: 1.1, align: "right" },
          ],
          rows: r.expenseRows!.rows.map((x) => [x.xid, isoDate(x.createdAt), `#${x.orderNumber}`, EXPENSE_LABEL[x.type], `-${money(x.amount)}`]),
        })
      : await renderReportPdf({
          title: "Order Transactions",
          store: r.storeName,
          subtitle,
          summary: [
            ["Transactions", String(r.counts.total)],
            ["Net earnings (delivered)", money(r.earnings.realized.net)],
            ["Pending earnings (est.)", money(r.earnings.pending.net)],
            ["Commission charged", money(r.earnings.realized.commission)],
            ["Refunded", money(r.earnings.refunded)],
          ],
          columns: [
            { label: "Order ID", weight: 1 },
            { label: "Date", weight: 1 },
            { label: "Customer", weight: 1.5 },
            { label: "Amount", weight: 1, align: "right" },
            { label: "Coupon", weight: 0.9, align: "right" },
            { label: "Discounted", weight: 1, align: "right" },
            { label: "Tax", weight: 0.8, align: "right" },
            { label: "Shipping", weight: 0.9, align: "right" },
            { label: "Order amount", weight: 1.1, align: "right" },
            { label: "Payment", weight: 1 },
          ],
          rows: r.orders!.rows.map((x) => [`#${x.orderNumber}`, isoDate(x.createdAt), x.customer, money(x.amount), money(x.couponDiscount), money(x.discountedAmount), money(x.tax), money(x.shipping), money(x.orderAmount), PAYMENT_REPORT_LABEL[x.payment]]),
        });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[vendor-reports] transaction export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
