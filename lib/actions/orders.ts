"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth-guard";
import { accountOrderHref } from "@/lib/orders";
import { cancelCustomerOrder, setOrderHidden } from "@/lib/orders.server";
import { settleCanceledCardOrder } from "@/lib/payments.server";
import { cancelOrderSchema, orderNumberSchema } from "@/lib/validations/customer-orders";

export type OrderActionResult = { ok: true; message: string } | { ok: false; message: string };

const INVALID: OrderActionResult = { ok: false, message: "That order couldn't be found." };

/**
 * My Order › Cancel — the signed-in customer's own order, only while no seller has started packing;
 * with `storeOrderId`, just that seller's items (while that seller hasn't started packing them).
 */
export async function cancelOrderAction(input: unknown): Promise<OrderActionResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { orderNumber, storeOrderId } = parsed.data;
  const res = await cancelCustomerOrder(orderNumber, user.id, storeOrderId);
  if (!res.ok) return { ok: false, message: res.error };
  // Card orders: what was paid for the canceled items goes back to the card (an unpaid one just closes).
  const { refunded } = await settleCanceledCardOrder(res.orderId);
  revalidatePath("/dashboard/orders");
  revalidatePath(accountOrderHref(orderNumber));
  revalidatePath("/dashboard/track-order");
  revalidatePath("/vendor", "layout"); // the sellers' order lists and sidebar counts
  const refundNote = refunded > 0 ? " — the amount is being refunded to your card" : "";
  return { ok: true, message: `${res.storeName ? `Items from ${res.storeName} canceled` : `Order #${orderNumber} canceled`}${refundNote}` };
}

/** My Order › Hide from my orders (or undo). The order itself is kept for sellers, admins and reports. */
export async function setOrderHiddenAction(input: unknown, hidden: boolean): Promise<OrderActionResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = orderNumberSchema.safeParse(input);
  if (!parsed.success || typeof hidden !== "boolean") return INVALID;
  if (!(await setOrderHidden(parsed.data.orderNumber, user.id, hidden))) return INVALID;
  revalidatePath("/dashboard/orders");
  return { ok: true, message: hidden ? `Order #${parsed.data.orderNumber} hidden from your list` : `Order #${parsed.data.orderNumber} is back in your list` };
}
