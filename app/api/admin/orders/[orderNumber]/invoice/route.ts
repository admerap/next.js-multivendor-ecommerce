import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { can } from "@/lib/access.server";
import { getAdminOrder } from "@/lib/admin-orders.server";
import { renderInvoice } from "@/lib/invoice.server";

/**
 * GET /api/admin/orders/[orderNumber]/invoice — the FULL order's invoice (every store's part, the
 * grand total), the same document the customer downloads. ADMIN only; anyone else → 404 (nothing to probe).
 */
export async function GET(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  if (!(await can("orders"))) return new NextResponse("Invoice not found.", { status: 404 });
  const { orderNumber } = await ctx.params;
  const n = /^\d{1,10}$/.test(orderNumber) ? Number(orderNumber) : NaN;
  const order = Number.isSafeInteger(n) ? await getAdminOrder(n) : null;
  if (!order) return new NextResponse("Invoice not found.", { status: 404 });

  try {
    const pdf = await renderInvoice(order);
    return downloadResponse(pdf, `sundry-invoice-${order.orderNumber}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-invoice] render failed", error instanceof Error ? error.message : error);
    return new NextResponse("We couldn't create the invoice right now. Please try again.", { status: 500 });
  }
}
