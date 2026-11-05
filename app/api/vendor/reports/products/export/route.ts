import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { money } from "@/lib/money";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { productReportSchema, REPORT_RANGE_LABEL, STOCK_LABEL } from "@/lib/validations/vendor-report";
import { currentVendorId } from "@/lib/vendor-auth";
import { getProductReport } from "@/lib/vendor-reports.server";

const STOCK_FILTER_LABEL = { in: "In stock", low: "Low stock", out: "Out of stock" } as const;

/**
 * GET /api/vendor/reports/products/export?format=csv|pdf&range=&tab=&stock=&q= — Product Report ›
 * Export: every product row of the current tab and filters (all pages), for the signed-in store only.
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return NextResponse.redirect(new URL(`/vendor/login?callbackUrl=${encodeURIComponent("/vendor/reports/products")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = productReportSchema.parse(Object.fromEntries(sp));
  try {
    const r = await getProductReport(vendorId, params, { all: true });
    const rows = r.table.rows;
    const name = `sundry-product-${params.tab === "stock" ? "stock" : "report"}-${params.range}-${isoDate(new Date())}`;
    const stock = (x: (typeof rows)[number]) => (x.stockStatus === "digital" ? "Digital" : String(x.stock));

    if (format === "csv") {
      const csv =
        params.tab === "stock"
          ? toCsv(["Product", "SKU", "Last Updated", "Current Stock", "Stock Status"], rows.map((x) => [x.name, x.sku ?? "", isoDate(x.updatedAt), stock(x), STOCK_LABEL[x.stockStatus]]))
          : toCsv(
              ["Product", "SKU", "Unit Price (USD)", "Total Amount Sold (USD)", "Qty Sold", "Avg Product Value (USD)", "Current Stock", "Avg Rating", "Reviews"],
              rows.map((x) => [x.name, x.sku ?? "", csvDollars(x.unitPrice), csvDollars(x.revenue), x.soldQty, x.soldQty ? csvDollars(x.avgValue) : "", stock(x), x.rating === null ? "" : x.rating.toFixed(2), x.reviewCount]),
            );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }

    const subtitle = [REPORT_RANGE_LABEL[params.range], params.tab === "stock" && "Products stock", params.tab === "stock" && params.stock && STOCK_FILTER_LABEL[params.stock], params.q && `Search: ${params.q}`].filter(Boolean).join(" · ");
    const summary: [string, string][] = [
      ["Total products", String(r.totalProducts)],
      ["Units sold", r.unitsSold.toLocaleString("en-US")],
      ["Total amount sold", money(r.totalSales)],
      ["Coupon discounts given", money(r.discountGiven)],
      ["Low / out of stock", `${r.lowStock} / ${r.outOfStock}`],
    ];
    const pdf =
      params.tab === "stock"
        ? await renderReportPdf({
            title: "Products Stock",
            store: r.storeName,
            subtitle,
            summary,
            columns: [
              { label: "Product", weight: 3.2 },
              { label: "SKU", weight: 1.4 },
              { label: "Last updated", weight: 1.2 },
              { label: "Current stock", weight: 1, align: "right" },
              { label: "Status", weight: 1.2 },
            ],
            rows: rows.map((x) => [x.name, x.sku ?? "", isoDate(x.updatedAt), stock(x), STOCK_LABEL[x.stockStatus]]),
          })
        : await renderReportPdf({
            title: "Product Report",
            store: r.storeName,
            subtitle,
            summary,
            columns: [
              { label: "Product", weight: 2.8 },
              { label: "Unit price", weight: 1, align: "right" },
              { label: "Amount sold", weight: 1.1, align: "right" },
              { label: "Qty sold", weight: 0.8, align: "right" },
              { label: "Avg value", weight: 1, align: "right" },
              { label: "Stock", weight: 0.8, align: "right" },
              { label: "Rating", weight: 0.9, align: "right" },
            ],
            rows: rows.map((x) => [x.name, money(x.unitPrice), money(x.revenue), String(x.soldQty), x.soldQty ? money(x.avgValue) : "—", stock(x), x.rating === null ? "—" : `${x.rating.toFixed(1)} (${x.reviewCount})`]),
          });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[vendor-reports] product export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this report right now. Please try again.", { status: 500 });
  }
}
