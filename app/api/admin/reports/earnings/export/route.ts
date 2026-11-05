import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { getAdminEarnings } from "@/lib/admin-reports.server";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { money } from "@/lib/money";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { ADMIN_REPORT_RANGE_LABEL, adminEarningsSchema } from "@/lib/validations/admin-report";

/**
 * GET /api/admin/reports/earnings/export?format=csv|pdf&range=&tab=admin|vendor&q= — Earning Reports ›
 * Export: the Admin Earning periods, or every store's Vendor Earning row (all pages). ADMIN only.
 * Not-yet-built figures (in-house, incentives, refunds, withdrawn) export empty in CSV and "—" in PDF.
 */
export async function GET(req: Request) {
  if (!(await can("reports"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/reports/earnings")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = adminEarningsSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getAdminEarnings(params, { all: true });
    const vendorTab = params.tab === "vendor";
    const name = `sundry-${vendorTab ? "vendor" : "admin"}-earnings-${params.range}-${isoDate(new Date())}`;
    const rangeLabel = ADMIN_REPORT_RANGE_LABEL[params.range];

    if (vendorTab) {
      const rows = r.vendor.rows.rows;
      if (format === "csv") {
        const csv = toCsv(
          ["Store", "Delivered orders", "Gross sales (USD)", "Commission paid (USD)", "Shipping (USD)", "Net earning (USD)", "Withdrawn (USD)", "Balance (USD)"],
          rows.map((v) => [v.store, v.orders, csvDollars(v.gross), csvDollars(v.commission), csvDollars(v.shipping), csvDollars(v.net), "", csvDollars(v.balance)]),
        );
        return downloadResponse(csv, `${name}.csv`, "csv");
      }
      const pdf = await renderReportPdf({
        title: "Vendor Earnings",
        store: "Sundry HQ",
        subtitle: [rangeLabel, params.q && `Search: ${params.q}`].filter(Boolean).join(" · "),
        summary: [
          ["Net earning", money(r.vendor.net)],
          ["Gross sales", money(r.vendor.gross)],
          ["Commission paid", money(r.vendor.commission)],
          ["Stores", String(rows.length)],
        ],
        columns: [
          { label: "Store", weight: 1.8 },
          { label: "Orders", weight: 0.6, align: "right" },
          { label: "Gross sales", weight: 1, align: "right" },
          { label: "Commission", weight: 1, align: "right" },
          { label: "Shipping", weight: 0.9, align: "right" },
          { label: "Net earning", weight: 1, align: "right" },
          { label: "Withdrawn", weight: 0.9, align: "right" },
          { label: "Balance", weight: 1, align: "right" },
        ],
        rows: rows.map((v) => [v.store, String(v.orders), money(v.gross), money(v.commission), money(v.shipping), money(v.net), "—", money(v.balance)]),
      });
      return downloadResponse(pdf, `${name}.pdf`, "pdf");
    }

    const rows = r.admin.rows;
    if (format === "csv") {
      const csv = toCsv(
        ["Duration", "In-house (USD)", "Commission (USD)", "Shipping (USD)", "Deliveryman incentive (USD)", "Discount given (USD)", "VAT / Tax (USD)", "Refunds (USD)", "Total (USD)"],
        rows.map((x) => [x.label, "", csvDollars(x.commission), csvDollars(x.shipping), "", csvDollars(x.discount), csvDollars(x.tax), "", csvDollars(x.total)]),
      );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }
    const pdf = await renderReportPdf({
      title: "Admin Earnings",
      store: "Sundry HQ",
      subtitle: rangeLabel,
      summary: [
        ["Total admin earning", money(r.admin.total)],
        ["Commission", money(r.admin.commission)],
        ["Shipping", money(r.admin.shipping)],
        ["Tax collected", money(r.admin.tax)],
      ],
      columns: [
        { label: "Duration", weight: 1 },
        { label: "In-house", weight: 0.8, align: "right" },
        { label: "Commission", weight: 1, align: "right" },
        { label: "Shipping", weight: 1, align: "right" },
        { label: "Incentive", weight: 0.8, align: "right" },
        { label: "Discount", weight: 0.9, align: "right" },
        { label: "VAT / Tax", weight: 0.9, align: "right" },
        { label: "Refunds", weight: 0.8, align: "right" },
        { label: "Total", weight: 1, align: "right" },
      ],
      rows: rows.map((x) => [x.label, "—", money(x.commission), money(x.shipping), "—", money(x.discount), money(x.tax), "—", money(x.total)]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-reports] earnings export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
