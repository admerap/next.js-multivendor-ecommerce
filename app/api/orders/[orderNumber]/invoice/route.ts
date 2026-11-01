import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { renderInvoice } from "@/lib/invoice.server";
import { getCustomerOrder } from "@/lib/orders.server";

/**
 * GET /api/orders/[orderNumber]/invoice — the order's invoice as a PDF download. Only the customer who
 * placed it may download it; any other order number answers 404 (same as unknown — nothing to probe).
 * TODO(vendor/admin invoices): vendors get their StoreOrder's part, admins the whole order.
 */
export async function GET(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const session = await auth();
  const { orderNumber } = await ctx.params;
  if (!session?.user) {
    const back = `/checkout/complete?order=${encodeURIComponent(orderNumber)}`;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(back)}`, req.url));
  }

  const n = /^\d{1,10}$/.test(orderNumber) ? Number(orderNumber) : NaN;
  const order = Number.isSafeInteger(n) ? await getCustomerOrder(n, session.user.id) : null;
  if (!order) return new NextResponse("Invoice not found.", { status: 404 });

  try {
    const pdf = await renderInvoice(order);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sundry-invoice-${order.orderNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[invoice] render failed", error instanceof Error ? error.message : error);
    return new NextResponse("We couldn't create the invoice right now. Please try again.", { status: 500 });
  }
}
