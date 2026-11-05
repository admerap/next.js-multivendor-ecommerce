import { Eye, PackageSearch, SearchX, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountCard } from "@/components/account/AccountCard";
import { TrackTab } from "@/components/account/orders/OrderDetail";
import { TrackOrderForm } from "@/components/account/orders/TrackOrderForm";
import { EmptyState } from "@/components/data/DashCard";
import { OrderProgressNote, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonClasses } from "@/components/ui/button-classes";
import { requireArea } from "@/lib/auth-guard";
import { SHIPPING_METHOD_INFO } from "@/lib/checkout";
import { accountOrderHref, customerOrderStatus, estimatedDelivery, orderAddress, orderProgressNote } from "@/lib/orders";
import { getCustomerOrder } from "@/lib/orders.server";

export const metadata: Metadata = { title: "Track Order", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string | string[] }> };

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const placedAt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Track Order (usertrackorder design). Tracking is for the signed-in customer's OWN orders: the lookup
 * is by number AND session customer, so another customer's number and a made-up one get the same
 * "Order not found" — nobody can learn whether an order number exists. Each seller ships separately,
 * so there's one progress line per seller, read live from its status.
 */
export default async function TrackOrderPage({ searchParams }: Props) {
  const user = await requireArea("CUSTOMER");
  const raw = (await searchParams).order;
  const query = (typeof raw === "string" ? raw : "").trim();
  const digits = query.replace(/^#/, "").trim();
  const valid = /^\d{1,10}$/.test(digits);
  const order = valid ? await getCustomerOrder(Number(digits), user.id) : null;

  return (
    <AccountCard>
      <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">Track Order</h1>
      <p className="mt-1.5 mb-6 text-sm text-fg-muted">Enter your order ID to see its latest delivery status.</p>
      <TrackOrderForm value={query} error={query && !valid ? "Enter the order number only, like 100002." : undefined} />

      <div className="mt-6">
        {!query || !valid ? (
          <EmptyState bare icon={PackageSearch} title="No order to track" description="Enter a valid order ID above to see its delivery progress." />
        ) : !order ? (
          <EmptyState bare icon={SearchX} title="Order not found" description={`We couldn't find order #${digits} in your account. Check the number on your order confirmation, or find it in My Orders.`}>
            <Link href="/dashboard/orders" className={buttonClasses.primary}>
              <ShoppingBag aria-hidden className="size-4" strokeWidth={2} />
              My Orders
            </Link>
          </EmptyState>
        ) : (
          <TrackedOrder order={order} />
        )}
      </div>
    </AccountCard>
  );
}

function TrackedOrder({ order }: { order: NonNullable<Awaited<ReturnType<typeof getCustomerOrder>>> }) {
  const statuses = order.storeOrders.map((s) => s.status);
  const status = customerOrderStatus(statuses);
  const live = statuses.filter((s) => s !== "CANCELED" && s !== "RETURNED" && s !== "FAILED");
  const eta = estimatedDelivery(order.createdAt, order.shippingMethod);
  const etaText =
    live.length === 0 ? "—" : live.every((s) => s === "DELIVERED") ? "Delivered" : `${day.format(eta.from)} – ${dayYear.format(eta.to)}`;
  const ship = orderAddress(order, "ship");
  const sellers = order.storeOrders.map((s) => s.vendor.storeName);

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Order summary" className="grid gap-x-6 gap-y-4 rounded-lg bg-sunken p-5 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:items-center">
        <div>
          <p className="text-caption text-fg-muted">Order ID</p>
          <p className="font-display text-lg font-extrabold text-fg-strong tabular-nums">#{order.orderNumber}</p>
          <p className="text-caption text-fg-subtle tabular-nums">{placedAt.format(order.createdAt)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-caption text-fg-muted">{sellers.length === 1 ? "Seller" : `Sellers (${sellers.length})`}</p>
          <p className="truncate font-semibold text-primary">{sellers.join(", ")}</p>
          <p className="truncate text-caption text-fg-muted">
            Ship to {ship.city}
            {ship.state ? `, ${ship.state}` : ""} · {SHIPPING_METHOD_INFO[order.shippingMethod].label}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-muted">Estimated delivery</p>
          <p className="font-semibold text-fg-strong tabular-nums">{etaText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:flex-col lg:items-end">
          <OrderStatusBadge status={status} />
          <OrderProgressNote note={orderProgressNote(statuses)} />
        </div>
      </section>

      {order.storeOrders.length > 1 && <p className="text-sm text-fg-muted">Each seller ships separately — here&apos;s the progress of every part of your order.</p>}
      <TrackTab order={order} withItems />

      <div className="flex justify-end">
        <Link href={accountOrderHref(order.orderNumber)} className={buttonClasses.secondary}>
          <Eye aria-hidden className="size-4" strokeWidth={2} />
          View order details
        </Link>
      </div>
    </div>
  );
}
