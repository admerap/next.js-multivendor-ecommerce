import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { money } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { orderReportSchema, REPORT_RANGE_LABEL } from "@/lib/validations/vendor-report";
import { currentVendorId } from "@/lib/vendor-auth";
import { getOrderReport } from "@/lib/vendor-reports.server";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

const GROUP_LABEL = { completed: "Delivered", ongoing: "Ongoing", canceled: "Canceled" } as const;
const COMMISSION_NOTE = { charged: "Charged", estimated: "Estimated", "not-charged": "Not charged" } as const;

/**
 * GET /api/vendor/reports/orders/export?format=xlsx|csv|pdf&range=&status=&q= — Order Report › Export:
 * every row matching the report's current filters (all pages), for the signed-in store only.
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return NextResponse.redirect(new URL(`/vendor/login?callbackUrl=${encodeURIComponent("/vendor/reports/orders")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = exportFormat(sp.get("format"));
  const params = orderReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getOrderReport(vendorId, params, { all: true });
    const rows = r.table.rows;
    const name = `sundry-order-report-${params.range}-${isoDate(new Date())}`;

    if (format !== "pdf") {
      const csv = toCsv(
        ["Order ID", "Order Date", "Total Amount (USD)", "Product Discount", "Coupon Discount (USD)", "Shipping (USD)", "VAT/Tax (USD)", "Commission (USD)", "Commission Status", "Status"],
        rows.map((x) => [`#${x.orderNumber}`, isoDate(x.createdAt), csvDollars(x.total), "Not recorded", csvDollars(x.couponDiscount), csvDollars(x.shipping), csvDollars(x.tax), x.commissionState === "not-charged" ? "Not charged" : csvDollars(x.commission), COMMISSION_NOTE[x.commissionState], ORDER_STATUS_LABEL[x.status]]),
      );
      return tableDownload(csv, name, format);
    }

    const pdf = await renderReportPdf({
      title: "Order Report",
      store: r.storeName,
      subtitle: [REPORT_RANGE_LABEL[params.range], params.status && `Status: ${GROUP_LABEL[params.status]}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · "),
      summary: [
        ["Total orders", r.totalOrders.toLocaleString("en-US")],
        ["Total order amount", money(r.totalAmount)],
        ["Average order", money(r.avgOrderValue)],
        ["Completed payments", money(r.payments.paid)],
        ["Delivered / Ongoing / Canceled", `${r.groups.completed} / ${r.groups.ongoing} / ${r.groups.canceled}`],
      ],
      columns: [
        { label: "Order ID", weight: 1.1 },
        { label: "Date", weight: 1.1 },
        { label: "Total amount", weight: 1.1, align: "right" },
        { label: "Product disc.", weight: 1, align: "right" },
        { label: "Coupon disc.", weight: 1, align: "right" },
        { label: "Shipping", weight: 1, align: "right" },
        { label: "VAT/Tax", weight: 1, align: "right" },
        { label: "Commission", weight: 1, align: "right" },
        { label: "Status", weight: 1.3 },
      ],
      rows: rows.map((x) => [
        `#${x.orderNumber}`,
        isoDate(x.createdAt),
        money(x.total),
        "—",
        money(x.couponDiscount),
        money(x.shipping),
        money(x.tax),
        x.commissionState === "not-charged" ? "— (not charged)" : `${money(x.commission)}${x.commissionState === "estimated" ? " est." : ""}`,
        ORDER_STATUS_LABEL[x.status],
      ]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[vendor-reports] order export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
