import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { listAdminReviews } from "@/lib/admin-reviews.server";
import { isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { ADMIN_REVIEW_STATUS_LABEL, adminReviewListSchema, REVIEW_STATUS_SLUGS, reviewRef } from "@/lib/validations/admin-review";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

const visibility = (r: { status: string; isVisible: boolean }) => (r.status !== "APPROVED" ? "—" : r.isVisible ? "Published" : "Hidden");

/**
 * GET /api/admin/reviews/export?format=xlsx|csv|pdf&status=&q=&rating=&store=&visibility= — Customer Review ›
 * Export: every review matching the list's current view (all pages). ADMIN only.
 */
export async function GET(req: Request) {
  if (!(await can("reviews"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/reviews")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = exportFormat(sp.get("format"));
  const params = adminReviewListSchema.parse(Object.fromEntries(sp));
  try {
    const { rows, total, counts } = await listAdminReviews(params, { all: true });
    const name = `sundry-reviews-${params.status ?? "all"}-${isoDate(new Date())}`;

    if (format !== "pdf") {
      const csv = toCsv(
        ["Review ID", "Date", "Product", "Store", "Customer", "Order", "Rating", "Title", "Review", "Photos", "Status", "Visibility"],
        rows.map((r) => [`#${reviewRef(r.id)}`, isoDate(r.createdAt), r.product.name, r.store.name, r.customer.name, `#${r.orderNumber}`, r.rating, r.title ?? "", r.comment, r.photoCount, ADMIN_REVIEW_STATUS_LABEL[r.status], visibility(r)]),
      );
      return tableDownload(csv, name, format);
    }

    const pdf = await renderReportPdf({
      title: params.status ? `${ADMIN_REVIEW_STATUS_LABEL[REVIEW_STATUS_SLUGS[params.status]]} Reviews` : "Customer Reviews",
      store: "Sundry HQ",
      subtitle: [params.rating && `${params.rating} stars`, params.visibility && (params.visibility === "visible" ? "Published" : "Hidden"), params.q && `Search: ${params.q}`].filter(Boolean).join(" · ") || "All reviews",
      summary: [
        ["Reviews", String(total)],
        ["Pending", String(counts.PENDING)],
        ["Approved", String(counts.APPROVED)],
        ["Denied", String(counts.REJECTED)],
      ],
      columns: [
        { label: "ID", weight: 0.9 },
        { label: "Date", weight: 0.9 },
        { label: "Product", weight: 1.8 },
        { label: "Customer", weight: 1.2 },
        { label: "Rating", weight: 0.6, align: "right" },
        { label: "Review", weight: 2.6 },
        { label: "Status", weight: 0.9 },
      ],
      rows: rows.map((r) => [`#${reviewRef(r.id)}`, isoDate(r.createdAt), r.product.name, r.customer.name, `${r.rating}/5`, r.comment, `${ADMIN_REVIEW_STATUS_LABEL[r.status]}${r.status === "APPROVED" && !r.isVisible ? " (hidden)" : ""}`]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-reviews] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export the reviews right now. Please try again.", { status: 500 });
  }
}
