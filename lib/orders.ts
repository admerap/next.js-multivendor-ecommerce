/** StoreOrder statuses (CLAUDE.md §6), in dashboard display order. */
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKAGING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
  "FAILED",
] as const;
export type OrderStatusKey = (typeof ORDER_STATUSES)[number];

export const noOrders = () => Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatusKey, number>;
