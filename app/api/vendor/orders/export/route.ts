import { NextResponse } from "next/server";
import { csvDollars } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { listExport, signInAgain } from "@/lib/list-export.server";
import { money } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, statusSlug } from "@/lib/orders";
import { vendorOrderListSchema } from "@/lib/validations/vendor-order";
import { currentVendorId } from "@/lib/vendor-auth";
import { exportVendorOrders, type VendorOrderRow } from "@/lib/vendor-orders.server";

/**
 * GET /api/vendor/orders/export?format=xlsx|csv|pdf&status=&q= — Order Manage › Export: every order of the signed-in
 * store matching the list's current filter (all pages). Same scoping and masking as the list.
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return signInAgain(req, "/vendor/login", "/vendor/orders");

  const params = vendorOrderListSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  let rows: VendorOrderRow[];
  let store: { storeName: string } | null;
  try {
    [rows, store] = await Promise.all([
      exportVendorOrders(vendorId, params),
      prisma.vendor.findUnique({ where: { id: vendorId }, select: { storeName: true } }),
    ]);
  } catch (error) {
    console.error("[vendor-orders] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export your orders right now. Please try again.", { status: 500 });
  }
  return listExport<VendorOrderRow>(req, {
    name: `orders-${params.status ? statusSlug(params.status) : "all"}`,
    title: "Orders",
    store: store?.storeName ?? "My store",
    subtitle: [params.status && `Status: ${ORDER_STATUS_LABEL[params.status]}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · ") || "All orders",
    columns: [
      { label: "Order ID", value: (r) => `#${r.orderNumber}`, weight: 0.9 },
      { label: "Order Date", value: (r) => r.createdAt.toISOString().replace("T", " ").slice(0, 16) + " UTC", weight: 1.3 },
      { label: "Customer", value: (r) => r.customerName, weight: 1.4 },
      { label: "Phone", value: (r) => r.customerPhone, weight: 1.1 },
      { label: "Items", value: (r) => r.itemCount, weight: 0.5, align: "right" },
      { label: "Total (USD)", value: (r) => csvDollars(r.total), pdf: (r) => money(r.total), weight: 0.9, align: "right" },
      { label: "Payment Method", value: (r) => PAYMENT_METHOD_LABEL[r.paymentMethod], weight: 1.1 },
      { label: "Payment Status", value: (r) => PAYMENT_STATUS_LABEL[r.paymentStatus], weight: 0.9 },
      { label: "Order Status", value: (r) => ORDER_STATUS_LABEL[r.status], weight: 1 },
    ],
    rows,
  });
}
