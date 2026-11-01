import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, type OrderStatusKey } from "@/lib/orders";

/** A store order's status pill (DESIGN_SYSTEM StatusBadge + §6 colours). Shared by storefront, vendor and admin. */
export function OrderStatusBadge({ status }: { status: OrderStatusKey }) {
  return <Badge tone={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
