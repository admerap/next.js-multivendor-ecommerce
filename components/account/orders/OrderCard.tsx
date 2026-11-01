import { Eye, ShoppingBag, Store, Truck } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";
import { accountOrderHref, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import type { CustomerOrderRow } from "@/lib/orders.server";
import { OrderActionsMenu } from "./OrderActionsMenu";

const placedAt = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** One order in My Order (userOrder design): number + status, items, sellers, date, total, ⋮ menu, Track / View. */
export function OrderCard({ order: o }: { order: CustomerOrderRow }) {
  return (
    <article aria-label={`Order #${o.orderNumber}`} className="overflow-hidden rounded-lg bg-card shadow-sm">
      {/* Phones: ⋮ pinned top-right and the total on its own line, so the order info gets the full width. */}
      <div className="relative flex items-start gap-4 p-5 max-sm:gap-3.5 max-sm:p-4 max-sm:pr-14">
        <span className="grid size-15 shrink-0 place-items-center rounded-md bg-iris-50 max-sm:size-11">
          <ShoppingBag aria-hidden className="size-7 text-primary max-sm:size-6" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-bold text-fg-strong tabular-nums">Order #{o.orderNumber}</h2>
            <OrderStatusBadge status={o.status} />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            <b className="font-semibold text-fg-strong tabular-nums">{o.itemCount}</b> {o.itemCount === 1 ? "Product" : "Products"}
            <span aria-hidden> · </span>
            {PAYMENT_METHOD_LABEL[o.paymentMethod]} · {PAYMENT_STATUS_LABEL[o.paymentStatus]}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-caption text-fg-muted">
            <Store aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
            <span className="truncate">{o.sellers.join(", ")}</span>
          </p>
          <p className="mt-0.5 text-caption text-fg-subtle tabular-nums">
            <time dateTime={o.createdAt.toISOString()}>{placedAt.format(o.createdAt)}</time>
          </p>
          <p className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5 sm:hidden">
            <span className="text-[0.7rem] font-bold tracking-[0.06em] text-fg-muted uppercase">Total</span>
            <span className="font-display text-lg font-extrabold text-primary tabular-nums">{money(o.total)}</span>
          </p>
        </div>
        <div className="flex items-start gap-1 max-sm:absolute max-sm:top-2 max-sm:right-2">
          <div className="text-right max-sm:hidden">
            <p className="text-[0.7rem] font-bold tracking-[0.06em] text-fg-muted uppercase">Total</p>
            <p className="font-display text-[1.375rem] font-extrabold text-primary tabular-nums">{money(o.total)}</p>
          </div>
          <OrderActionsMenu orderNumber={o.orderNumber} canCancel={o.canCancel} />
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line bg-sunken px-5 py-3.5 max-sm:grid max-sm:grid-cols-2 max-sm:px-4">
        <Button asChild variant="secondary">
          <Link href={`${accountOrderHref(o.orderNumber)}?tab=track`}>
            <Truck aria-hidden />
            Track Order
          </Link>
        </Button>
        <Button asChild>
          <Link href={accountOrderHref(o.orderNumber)}>
            <Eye aria-hidden />
            View Details
          </Link>
        </Button>
      </div>
    </article>
  );
}
