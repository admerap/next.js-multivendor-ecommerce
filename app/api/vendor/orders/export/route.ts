import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { csvDollars, isoDate, toCsv } from "@/lib/csv";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, statusSlug } from "@/lib/orders";
import { vendorOrderListSchema } from "@/lib/validations/vendor-order";
import { currentVendorId } from "@/lib/vendor-auth";
import { exportVendorOrders } from "@/lib/vendor-orders.server";

/**
 * GET /api/vendor/orders/export?status=&q= — Order Manage › Export: every order of the signed-in store
 * matching the list's current filter (all pages), as CSV. Same scoping and masking as the list.
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return NextResponse.redirect(new URL(`/vendor/login?callbackUrl=${encodeURIComponent("/vendor/orders")}`, req.url));

  const url = new URL(req.url);
  const params = vendorOrderListSchema.parse(Object.fromEntries(url.searchParams));
  try {
    const rows = await exportVendorOrders(vendorId, params);
    const csv = toCsv(
      ["Order ID", "Order Date", "Customer", "Phone", "Items", "Total (USD)", "Payment Method", "Payment Status", "Order Status"],
      rows.map((r) => [
        `#${r.orderNumber}`,
        r.createdAt.toISOString().replace("T", " ").slice(0, 16) + " UTC",
        r.customerName,
        r.customerPhone,
        r.itemCount,
        csvDollars(r.total),
        PAYMENT_METHOD_LABEL[r.paymentMethod],
        PAYMENT_STATUS_LABEL[r.paymentStatus],
        ORDER_STATUS_LABEL[r.status],
      ]),
    );
    return downloadResponse(csv, `sundry-orders-${params.status ? statusSlug(params.status) : "all"}-${isoDate(new Date())}.csv`, "csv");
  } catch (error) {
    console.error("[vendor-orders] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export your orders right now. Please try again.", { status: 500 });
  }
}
