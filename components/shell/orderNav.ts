import { ShoppingCart } from "lucide-react";
import { orderFilterLabel, statusSlug, type OrderStatusKey } from "@/lib/orders";
import type { NavItem } from "./DashShell";

/** Order Manage list, in the designs' order (vendororderlist / adminallorders). */
const ORDER_FILTERS: OrderStatusKey[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED", "FAILED", "CANCELED"];

/**
 * The "Order Manage" sidebar group shared by the Seller Center and the admin panel: All Orders + one
 * link per status (`${base}?status=…`), each with its size; Pending (needs action) is saffron and is
 * also the parent's pill. `counts`: the vendor's parts per status, or the admin's orders per overall status.
 */
export function orderManageNav(base: string, counts: Record<OrderStatusKey, number>): NavItem {
  return {
    label: "Order Manage",
    icon: ShoppingCart,
    count: counts.PENDING,
    tone: "saffron",
    children: [
      { label: "All Orders", href: base, count: Object.values(counts).reduce((a, b) => a + b, 0), tone: "iris" },
      ...ORDER_FILTERS.map((s) => ({
        label: orderFilterLabel(s),
        href: `${base}?status=${statusSlug(s)}`,
        count: counts[s],
        tone: s === "PENDING" ? ("saffron" as const) : ("iris" as const),
      })),
    ],
  };
}
