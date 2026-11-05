"use server";

import { revalidatePath } from "next/cache";
import { accountOrderHref, ORDER_STATUS_LABEL, vendorOrderHref } from "@/lib/orders";
import { vendorStatusUpdateSchema } from "@/lib/validations/vendor-order";
import { currentVendor } from "@/lib/vendor-auth";
import { updateVendorOrderStatus } from "@/lib/vendor-orders.server";

export type VendorOrderActionResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Order details › Change order status. VENDOR only; the store comes from the session and must own the
 * StoreOrder. Writes StoreOrder.status, which the customer's order details and tracking read live.
 */
export async function updateSubOrderStatus(input: unknown): Promise<VendorOrderActionResult> {
  const me = await currentVendor();
  if (!me) return { ok: false, message: "Your session has expired. Please sign in again." };
  const parsed = vendorStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That status change isn't valid." };

  const res = await updateVendorOrderStatus(parsed.data.id, me.vendorId, parsed.data.status, me.userId);
  if (!res.ok) return { ok: false, message: res.error };

  // Seller views (list, details, sidebar counts in the panel layout) and the customer's views of this order.
  revalidatePath("/vendor", "layout");
  revalidatePath(vendorOrderHref(parsed.data.id));
  revalidatePath("/dashboard/orders");
  revalidatePath(accountOrderHref(res.orderNumber));
  revalidatePath("/dashboard/track-order");
  return { ok: true, message: `Order #${res.orderNumber} moved to ${ORDER_STATUS_LABEL[parsed.data.status]}` };
}
