"use server";

import { after } from "next/server";
import { auth } from "@/auth";
import { placeOrder, type PlaceOrderError } from "@/lib/orders.server";
import { abandonCardOrder, createOrderPayment, MAX_OPEN_CARD_ORDERS, openCardOrders, releaseUnpaidCardOrder, sweepExpiredCardOrders } from "@/lib/payments.server";
import { stripeConfigProblem, stripeEnabled } from "@/lib/stripe.server";
import { checkoutAddressesSchema, placeOrderSchema, type CheckoutAddresses } from "@/lib/validations/checkout";

export type AddressesResult = { success: true; data: CheckoutAddresses } | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Shipping & Billing → "Proceed to Payment": validates the addresses on the server (signed-in customers
 * only) and returns the normalized values the Payment step and placeOrder use. placeOrder validates them
 * again — nothing from the browser is trusted as-is.
 */
export async function confirmAddresses(input: unknown): Promise<AddressesResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Your session has ended. Sign in again to continue." };
  if (session.user.role !== "CUSTOMER") return { success: false, error: "Checkout is available to customer accounts only." };

  const parsed = checkoutAddressesSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    // "shipping.city", "billing.zip" … → first message per field
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
    return { success: false, error: "Check the highlighted fields.", fieldErrors };
  }
  return { success: true, data: parsed.data };
}

export type PlaceOrderActionResult =
  /** `clientSecret` only for a card order: the browser confirms that PaymentIntent with Stripe.js. */
  | { success: true; orderNumber: number; clientSecret?: string }
  | { success: false; error: string; code: PlaceOrderError["code"] | "AUTH" | "INVALID" | "SERVER" | "PAYMENT" };

/**
 * Place Order (Payment step). Signed-in customers only; every input re-validated with Zod (addresses,
 * terms, payment method) and the order itself rebuilt from live data by placeOrder — prices, stock,
 * coupons and totals are never taken from the browser.
 */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, code: "AUTH", error: "Your session has ended. Sign in again to place your order." };
  if (session.user.role !== "CUSTOMER") return { success: false, code: "AUTH", error: "Checkout is available to customer accounts only." };

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path[0];
    const error =
      where === "acceptTerms" || where === "paymentMethod" || where === "lines"
        ? first!.message
        : where === "addresses"
          ? "Your shipping details need attention. Go back to Shipping & Billing and check them."
          : "Your order couldn't be read. Refresh the page and try again.";
    return { success: false, code: "INVALID", error };
  }

  const card = parsed.data.paymentMethod === "STRIPE";
  if (card && !stripeEnabled()) {
    console.error("[place order] card payment refused:", stripeConfigProblem());
    return { success: false, code: "PAYMENT", error: "Card payments aren't available right now. Choose Cash on Delivery or try again later." };
  }

  // Background housekeeping after the response: release card orders left unpaid past their window.
  after(() => sweepExpiredCardOrders());

  const { retryOf, ...order } = parsed.data;
  try {
    // A card retry with a changed cart: close the shopper's own earlier unpaid card order first (its stock is
    // free again). If it turns out it was paid meanwhile, that order stands — don't place a second one.
    if (retryOf && (await abandonCardOrder(retryOf, session.user.id)) === "paid") return { success: true, orderNumber: retryOf };
    if (card && (await openCardOrders(session.user.id)) >= MAX_OPEN_CARD_ORDERS) {
      return {
        success: false,
        code: "PAYMENT",
        error: `You have ${MAX_OPEN_CARD_ORDERS} card orders waiting for payment. Cancel one in My Orders, pay with Cash on Delivery, or try again in 30 minutes.`,
      };
    }

    const res = await placeOrder({ customerId: session.user.id, ...order });
    if (!res.ok) return { success: false, code: res.code, error: res.message };
    if (!card) return { success: true, orderNumber: res.orderNumber };

    // Card: the order exists (UNPAID, stock reserved). Open its PaymentIntent for the SAVED total; if Stripe
    // can't, release the order (stock and coupon back) so nothing is left half-placed.
    try {
      const payment = await createOrderPayment(res.orderId);
      return { success: true, orderNumber: res.orderNumber, clientSecret: payment.clientSecret };
    } catch (error) {
      console.error("[place order] PaymentIntent failed", error instanceof Error ? error.message.replace(/(sk|rk|pi|seti)_\w+/g, "$1_***") : error);
      await releaseUnpaidCardOrder(res.orderId);
      return { success: false, code: "PAYMENT", error: "We couldn't start the card payment. Nothing was charged — try again or choose Cash on Delivery." };
    }
  } catch (error) {
    console.error("[place order] failed", error instanceof Error ? error.message : error);
    return { success: false, code: "SERVER", error: "We couldn't place your order. Nothing was charged — please try again." };
  }
}
