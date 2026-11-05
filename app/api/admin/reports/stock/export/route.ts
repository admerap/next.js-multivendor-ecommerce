import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { getAdminStockReport } from "@/lib/admin-reports.server";
import { isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { adminStockReportSchema, STOCK_LEVEL_LABEL, STOCK_SORTS } from "@/lib/validations/admin-report";

/**
 * GET /api/admin/reports/stock/export?format=csv|pdf&store=&category=&level=&sort=&q= — Product Stock Report ›
 * Export: every product matching the current view (all pages), with its live stock. ADMIN only.
 */
export async function GET(req: Request) {
  if (!(await can("reports"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/reports/stock")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = adminStockReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getAdminStockReport(params, { all: true });
    const rows = r.table.rows;
    const name = `sundry-product-stock-${isoDate(new Date())}`;

    if (format === "csv") {
      const csv = toCsv(
        ["Product", "Store", "Category", "Last updated", "Current stock", "Status", "Variations out", "Variations low"],
        rows.map((x) => [x.name, x.store, x.category, x.updatedAt.toISOString(), x.stock, STOCK_LEVEL_LABEL[x.level], x.variationsOut.join("; "), x.variationsLow.join("; ")]),
      );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }

    const store = r.store ? r.stores.find((s) => s.id === r.store)?.name : undefined;
    const category = r.category ? r.categories.find((c) => c.id === r.category)?.name : undefined;
    const pdf = await renderReportPdf({
      title: "Product Stock Report",
      store: "Sundry HQ",
      subtitle: [store ?? "All stores", category ?? "All categories", params.level && STOCK_LEVEL_LABEL[params.level], `Sorted: ${STOCK_SORTS[params.sort]}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · "),
      summary: [
        ["Products", String(r.counts.all)],
        ["Out of stock", String(r.counts.out)],
        ["Soon stock out", String(r.counts.low)],
        ["In stock", String(r.counts.in)],
      ],
      columns: [
        { label: "Product", weight: 2.6 },
        { label: "Store", weight: 1.3 },
        { label: "Category", weight: 1.1 },
        { label: "Last updated", weight: 1 },
        { label: "Stock", weight: 0.7, align: "right" },
        { label: "Status", weight: 1.1 },
      ],
      rows: rows.map((x) => [x.name, x.store, x.category, isoDate(x.updatedAt), String(x.stock), STOCK_LEVEL_LABEL[x.level]]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-reports] stock export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
