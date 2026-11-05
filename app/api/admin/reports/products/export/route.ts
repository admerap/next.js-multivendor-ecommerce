import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { getAdminProductReport } from "@/lib/admin-reports.server";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { money } from "@/lib/money";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { ADMIN_REPORT_RANGE_LABEL, adminProductReportSchema, STOCK_LEVEL_LABEL } from "@/lib/validations/admin-report";
import { APPROVAL_LABELS } from "@/lib/validations/product";

/**
 * GET /api/admin/reports/products/export?format=csv|pdf&range=&store=&status=&tab=all|wishlist&q= — Product
 * Report › Export: every product matching the report's current view (all pages). ADMIN only.
 */
export async function GET(req: Request) {
  if (!(await can("reports"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/reports/products")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = adminProductReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getAdminProductReport(params, { all: true });
    const rows = r.table.rows;
    const wishlist = params.tab === "wishlist";
    const name = `sundry-${wishlist ? "wishlisted-products" : "product-report"}-${params.range}-${isoDate(new Date())}`;
    const availability = (x: (typeof rows)[number]) => (x.level ? STOCK_LEVEL_LABEL[x.level] : "Digital");
    const store = r.store ? r.stores.find((s) => s.id === r.store)?.name : undefined;
    const subtitle = [ADMIN_REPORT_RANGE_LABEL[params.range], store ?? "All stores", params.status && `Status: ${params.status}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · ");

    if (wishlist) {
      if (format === "csv") {
        const csv = toCsv(["Product", "Store", "Price (USD)", "Wishlisted by", "Availability"], rows.map((x) => [x.name, x.store, csvDollars(x.unitPrice), x.wishlisted, availability(x)]));
        return downloadResponse(csv, `${name}.csv`, "csv");
      }
      const pdf = await renderReportPdf({
        title: "Wish Listed Products",
        store: "Sundry HQ",
        subtitle,
        summary: [["Wishlisted products", String(rows.length)], ["Saves", String(rows.reduce((n, x) => n + x.wishlisted, 0))]],
        columns: [
          { label: "Product", weight: 2.6 },
          { label: "Store", weight: 1.3 },
          { label: "Price", weight: 0.9, align: "right" },
          { label: "Wishlisted by", weight: 1, align: "right" },
          { label: "Availability", weight: 1.1 },
        ],
        rows: rows.map((x) => [x.name, x.store, money(x.unitPrice), String(x.wishlisted), availability(x)]),
      });
      return downloadResponse(pdf, `${name}.pdf`, "pdf");
    }

    if (format === "csv") {
      const csv = toCsv(
        ["Product", "Store", "Category", "Unit price (USD)", "Amount sold (USD)", "Qty sold", "Avg. value (USD)", "In stock", "Status"],
        rows.map((x) => [x.name, x.store, x.category, csvDollars(x.unitPrice), csvDollars(x.revenue), x.soldQty, x.avgValue === null ? "" : csvDollars(x.avgValue), x.stock ?? "Digital", APPROVAL_LABELS[x.approvalStatus]]),
      );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }
    const pdf = await renderReportPdf({
      title: "Product Report",
      store: "Sundry HQ",
      subtitle,
      summary: [
        ["Products", String(r.totalProducts)],
        ["Units sold", String(r.unitsSold)],
        ["Amount sold", money(rows.reduce((n, x) => n + x.revenue, 0))],
        ["Coupon discounts", money(r.discountGiven)],
      ],
      columns: [
        { label: "Product", weight: 2.4 },
        { label: "Store", weight: 1.2 },
        { label: "Unit price", weight: 0.9, align: "right" },
        { label: "Amount sold", weight: 1, align: "right" },
        { label: "Qty", weight: 0.6, align: "right" },
        { label: "Avg. value", weight: 0.9, align: "right" },
        { label: "Stock", weight: 0.7, align: "right" },
        { label: "Status", weight: 0.9 },
      ],
      rows: rows.map((x) => [x.name, x.store, money(x.unitPrice), money(x.revenue), String(x.soldQty), x.avgValue === null ? "—" : money(x.avgValue), x.stock === null ? "Digital" : String(x.stock), APPROVAL_LABELS[x.approvalStatus]]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-reports] products export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
