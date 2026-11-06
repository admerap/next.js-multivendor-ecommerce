import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { getAdminOrderReport } from "@/lib/admin-reports.server";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { money } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { ADMIN_ORDER_GROUP_LABEL, ADMIN_REPORT_RANGE_LABEL, adminOrderReportSchema } from "@/lib/validations/admin-report";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

/**
 * GET /api/admin/reports/orders/export?format=xlsx|csv|pdf&range=&store=&status=&q= — Order Report › Export: every
 * store order matching the report's current view (all pages). ADMIN only. Product discount isn't recorded
 * on orders: empty in CSV, "—" in PDF.
 */
export async function GET(req: Request) {
  if (!(await can("reports"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/reports/orders")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = exportFormat(sp.get("format"));
  const params = adminOrderReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getAdminOrderReport(params, { all: true });
    const rows = r.table.rows;
    const name = `sundry-order-report-${params.range}-${isoDate(new Date())}`;

    if (format !== "pdf") {
      const csv = toCsv(
        ["Order ID", "Store", "Date", "Total (USD)", "Due (USD)", "Return (USD)", "Product discount (USD)", "Coupon discount (USD)", "Shipping (USD)", "Status", "Payment"],
        rows.map((o) => [
          `#${o.orderNumber}`, o.store, isoDate(o.createdAt), csvDollars(o.total), csvDollars(o.due), csvDollars(o.returned), "",
          csvDollars(o.couponDiscount), csvDollars(o.shipping), ORDER_STATUS_LABEL[o.status], o.paymentStatus,
        ]),
      );
      return tableDownload(csv, name, format);
    }

    const store = r.store ? r.stores.find((s) => s.id === r.store)?.name : undefined;
    const pdf = await renderReportPdf({
      title: "Order Report",
      store: "Sundry HQ",
      subtitle: [ADMIN_REPORT_RANGE_LABEL[params.range], store ?? "All stores", params.status && ADMIN_ORDER_GROUP_LABEL[params.status], params.q && `Search: ${params.q}`].filter(Boolean).join(" · "),
      summary: [
        ["Orders", String(r.counts.total)],
        ["Completed", String(r.counts.completed)],
        ["Already settled", money(r.settledAmount)],
        ["Due", money(r.dueAmount)],
      ],
      columns: [
        { label: "Order", weight: 0.8 },
        { label: "Store", weight: 1.5 },
        { label: "Date", weight: 1 },
        { label: "Total", weight: 0.9, align: "right" },
        { label: "Due", weight: 0.8, align: "right" },
        { label: "Return", weight: 0.8, align: "right" },
        { label: "Prod. disc.", weight: 0.8, align: "right" },
        { label: "Coupon", weight: 0.8, align: "right" },
        { label: "Shipping", weight: 0.8, align: "right" },
        { label: "Status", weight: 1.1 },
      ],
      rows: rows.map((o) => [
        `#${o.orderNumber}`, o.store, isoDate(o.createdAt), money(o.total), money(o.due), money(o.returned), "—", money(o.couponDiscount), money(o.shipping), ORDER_STATUS_LABEL[o.status],
      ]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-reports] orders export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
