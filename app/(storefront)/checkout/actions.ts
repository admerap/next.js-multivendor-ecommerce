"use server";

import { auth } from "@/auth";
import { placeOrder, type PlaceOrderError } from "@/lib/orders.server";
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
  | { success: true; orderNumber: number }
  | { success: false; error: string; code: PlaceOrderError["code"] | "AUTH" | "INVALID" | "SERVER" };

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

  try {
    const res = await placeOrder({ customerId: session.user.id, ...parsed.data });
    if (!res.ok) return { success: false, code: res.code, error: res.message };
    return { success: true, orderNumber: res.orderNumber };
  } catch (error) {
    console.error("[place order] failed", error instanceof Error ? error.message : error);
    return { success: false, code: "SERVER", error: "We couldn't place your order. Nothing was charged — please try again." };
  }
}
