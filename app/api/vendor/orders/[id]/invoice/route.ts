import { NextResponse } from "next/server";
import { downloadResponse } from "@/lib/download";
import { renderInvoice } from "@/lib/invoice.server";
import { currentVendorId } from "@/lib/vendor-auth";
import { getVendorOrderView } from "@/lib/vendor-orders.server";

/**
 * GET /api/vendor/orders/[id]/invoice — the signed-in vendor's part of a customer order (its StoreOrder)
 * as a PDF: only its own items and totals, never another seller's. The vendor comes from the session;
 * another store's id answers 404, the same as an unknown one.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const vendorId = await currentVendorId();
  if (!vendorId) return NextResponse.redirect(new URL(`/vendor/login?callbackUrl=${encodeURIComponent("/vendor/orders")}`, req.url));

  const { id } = await ctx.params;
  const order = /^[a-z0-9]{1,40}$/i.test(id) ? await getVendorOrderView(id, vendorId) : null;
  if (!order) return new NextResponse("Invoice not found.", { status: 404 });

  try {
    const pdf = await renderInvoice(order, { sellerCopy: true });
    return downloadResponse(pdf, `sundry-invoice-${order.orderNumber}-seller.pdf`, "pdf");
  } catch (error) {
    console.error("[vendor-invoice] render failed", error instanceof Error ? error.message : error);
    return new NextResponse("We couldn't create the invoice right now. Please try again.", { status: 500 });
  }
}
