import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, type OrderStatusKey } from "@/lib/orders";

/** A store order's status pill (DESIGN_SYSTEM StatusBadge + §6 colours). Shared by storefront, vendor and admin. */
export function OrderStatusBadge({ status }: { status: OrderStatusKey }) {
  return <Badge tone={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

/**
 * Next to a multi-seller order's badge: how far the other sellers got ("2 of 3 delivered"), since the
 * badge shows the least advanced part. Renders nothing when every seller is at the same step.
 */
export function OrderProgressNote({ note }: { note: string | null }) {
  if (!note) return null;
  return <span className="text-caption font-semibold text-fg-muted tabular-nums">{note}</span>;
}
