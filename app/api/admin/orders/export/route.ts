import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { can } from "@/lib/access.server";
import { listAdminOrders } from "@/lib/admin-orders.server";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { money } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { ADMIN_PAYMENT_LABEL, adminOrderListSchema, adminOrderListTitle } from "@/lib/validations/admin-order";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

/**
 * GET /api/admin/orders/export?format=xlsx|csv|pdf&status=&q=&store=&payment=&from=&to= — Order Manage ›
 * Export: every order matching the list's current view (all pages). ADMIN only.
 */
export async function GET(req: Request) {
  if (!(await can("orders"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/orders")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = exportFormat(sp.get("format"));
  const params = adminOrderListSchema.parse(Object.fromEntries(sp));
  try {
    const data = await listAdminOrders(params, { all: true });
    const rows = data.rows;
    const name = `sundry-orders-${params.status ? params.status.toLowerCase() : "all"}-${isoDate(new Date())}`;

    if (format !== "pdf") {
      const csv = toCsv(
        ["Order ID", "Order Date", "Customer", "Email", "Phone", "Stores", "Items", "Total (USD)", "Payment Method", "Payment Status", "Status", "Progress"],
        rows.map((o) => [`#${o.orderNumber}`, isoDate(o.createdAt), o.customerName, o.customerEmail, o.customerPhone, o.stores.map((s) => s.name).join("; "), o.itemCount, csvDollars(o.total), PAYMENT_METHOD_LABEL[o.paymentMethod], PAYMENT_STATUS_LABEL[o.paymentStatus], ORDER_STATUS_LABEL[o.status], o.progressNote ?? ""]),
      );
      return tableDownload(csv, name, format);
    }

    const store = params.store && data.storeOptions.find((s) => s.id === params.store)?.name;
    const pdf = await renderReportPdf({
      title: adminOrderListTitle(params),
      store: "Sundry HQ",
      subtitle: [store && `Store: ${store}`, params.payment && `Payment: ${ADMIN_PAYMENT_LABEL[params.payment]}`, params.from && `From ${params.from}`, params.to && `To ${params.to}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · ") || "All orders",
      summary: [
        ["Orders", String(data.total)],
        ["Total value", money(rows.reduce((n, o) => n + o.total, 0))],
        ["Paid", String(rows.filter((o) => o.paymentStatus === "PAID").length)],
        ["Multi-store orders", String(rows.filter((o) => o.stores.length > 1).length)],
      ],
      columns: [
        { label: "Order ID", weight: 0.9 },
        { label: "Date", weight: 0.9 },
        { label: "Customer", weight: 1.4 },
        { label: "Stores", weight: 1.8 },
        { label: "Items", weight: 0.5, align: "right" },
        { label: "Total", weight: 0.9, align: "right" },
        { label: "Payment", weight: 0.8 },
        { label: "Status", weight: 1.2 },
      ],
      rows: rows.map((o) => [`#${o.orderNumber}`, isoDate(o.createdAt), o.customerName, o.stores.map((s) => s.name).join(", "), String(o.itemCount), money(o.total), PAYMENT_STATUS_LABEL[o.paymentStatus], ORDER_STATUS_LABEL[o.status]]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-orders] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export the orders right now. Please try again.", { status: 500 });
  }
}
