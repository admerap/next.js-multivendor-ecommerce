"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth-guard";
import { accountOrderHref } from "@/lib/orders";
import { cancelCustomerOrder, setOrderHidden } from "@/lib/orders.server";
import { orderNumberSchema } from "@/lib/validations/customer-orders";

export type OrderActionResult = { ok: true; message: string } | { ok: false; message: string };

const INVALID: OrderActionResult = { ok: false, message: "That order couldn't be found." };

/** My Order › Cancel — the signed-in customer's own order, only while no seller has started packing. */
export async function cancelOrderAction(input: unknown): Promise<OrderActionResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = orderNumberSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const res = await cancelCustomerOrder(parsed.data.orderNumber, user.id);
  if (!res.ok) return { ok: false, message: res.error };
  revalidatePath("/account/orders");
  revalidatePath(accountOrderHref(parsed.data.orderNumber));
  return { ok: true, message: `Order #${parsed.data.orderNumber} canceled` };
}

/** My Order › Hide from my orders (or undo). The order itself is kept for sellers, admins and reports. */
export async function setOrderHiddenAction(input: unknown, hidden: boolean): Promise<OrderActionResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = orderNumberSchema.safeParse(input);
  if (!parsed.success || typeof hidden !== "boolean") return INVALID;
  if (!(await setOrderHidden(parsed.data.orderNumber, user.id, hidden))) return INVALID;
  revalidatePath("/account/orders");
  return { ok: true, message: hidden ? `Order #${parsed.data.orderNumber} hidden from your list` : `Order #${parsed.data.orderNumber} is back in your list` };
}
