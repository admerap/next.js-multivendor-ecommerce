import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * When a store's part of an order was delivered — the date its earnings count on. Sundry's commission is
 * charged on delivery (lib/orders commissionState), so every earnings figure (admin + vendor reports and
 * dashboards) is bucketed by this date, while order and sales figures stay on the order date.
 *
 * Source of truth: the part's latest DELIVERED StoreOrderStatusEvent (every status change writes one; older
 * parts were backfilled by the storeorder_history_and_payment migration). Fallbacks for a part with no such
 * event: paidAt (set when a COD part is delivered), else the order date — the best date known for it.
 */

/** Select on a StoreOrder: its latest DELIVERED event (+ the fallbacks). */
export const DELIVERY_SELECT = {
  paidAt: true,
  createdAt: true,
  events: { where: { status: "DELIVERED" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
} satisfies Prisma.StoreOrderSelect;

export const deliveredAt = (p: { events: { createdAt: Date }[]; paidAt: Date | null; createdAt: Date }): Date => p.events[0]?.createdAt ?? p.paidAt ?? p.createdAt;

/**
 * Where: parts delivered within [from, to) — the same fallbacks as deliveredAt(), so a part without a DELIVERED
 * event (none should exist, but never drop one) still counts on its paidAt, else its order date. Callers still
 * filter by deliveredAt() in code: a part re-delivered later has an older DELIVERED event in range too.
 */
export const deliveredBetween = (range: { gte: Date; lt: Date }): Prisma.StoreOrderWhereInput => ({
  status: "DELIVERED",
  OR: [
    { events: { some: { status: "DELIVERED", createdAt: range } } },
    { events: { none: { status: "DELIVERED" } }, paidAt: range },
    { events: { none: { status: "DELIVERED" } }, paidAt: null, createdAt: range },
  ],
});
