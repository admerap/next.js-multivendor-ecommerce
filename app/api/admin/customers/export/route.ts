import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { listAdminCustomers } from "@/lib/admin-customers.server";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { money } from "@/lib/money";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { adminCustomerListSchema, CUSTOMER_SORTS } from "@/lib/validations/admin-customer";

/**
 * GET /api/admin/customers/export?format=csv|pdf&q=&ordered=&joined=&status=&sort= — Customer List ›
 * Export: every customer matching the list's current view (all pages). ADMIN only.
 */
export async function GET(req: Request) {
  if (!(await can("customers"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/customers")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = adminCustomerListSchema.parse(Object.fromEntries(sp));
  try {
    const { rows, total, blocked } = await listAdminCustomers(params, { all: true });
    const name = `sundry-customers-${isoDate(new Date())}`;

    if (format === "csv") {
      const csv = toCsv(
        ["Name", "Email", "Phone", "Joined", "Orders", "Spent (USD)", "Status"],
        rows.map((c) => [c.name, c.email, c.phone ?? "", isoDate(c.createdAt), c.orders, csvDollars(c.spent), c.blockedAt ? "Blocked" : "Active"]),
      );
      return downloadResponse(csv, `${name}.csv`, "csv");
    }

    const pdf = await renderReportPdf({
      title: "Customer List",
      store: "Sundry HQ",
      subtitle: [params.status && (params.status === "blocked" ? "Blocked" : "Active"), params.joined && `Joined from ${params.joined}`, params.ordered && `Ordered from ${params.ordered}`, `Sorted: ${CUSTOMER_SORTS[params.sort]}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · "),
      summary: [
        ["Customers", String(total)],
        ["Blocked", String(blocked)],
        ["Orders", String(rows.reduce((n, c) => n + c.orders, 0))],
        ["Spent", money(rows.reduce((n, c) => n + c.spent, 0))],
      ],
      columns: [
        { label: "Name", weight: 1.4 },
        { label: "Email", weight: 1.9 },
        { label: "Phone", weight: 1.1 },
        { label: "Joined", weight: 0.9 },
        { label: "Orders", weight: 0.6, align: "right" },
        { label: "Spent", weight: 0.9, align: "right" },
        { label: "Status", weight: 0.7 },
      ],
      rows: rows.map((c) => [c.name, c.email, c.phone ?? "—", isoDate(c.createdAt), String(c.orders), money(c.spent), c.blockedAt ? "Blocked" : "Active"]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-customers] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export the customers right now. Please try again.", { status: 500 });
  }
}
