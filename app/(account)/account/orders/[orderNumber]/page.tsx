import { FileDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountCard } from "@/components/account/AccountCard";
import { DeliveryTab, ORDER_TABS, OrderTabs, ReviewsTab, SummaryTab, TrackTab, VendorTab, type OrderTab } from "@/components/account/orders/OrderDetail";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { requireArea } from "@/lib/auth-guard";
import { accountOrderHref, canCustomerCancel, customerOrderStatus, invoiceHref } from "@/lib/orders";
import { getCustomerOrder, reviewsForItems, visibleProductCounts } from "@/lib/orders.server";

type Props = { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ tab?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${(await params).orderNumber}`, robots: { index: false } };
}

const placedAt = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Order details (userorderdetails design): the signed-in customer's OWN order — any other number is a
 * 404, the same answer as an unknown one. Tabs: summary (items grouped by seller), vendor info,
 * delivery, reviews and the per-seller tracking line.
 */
export default async function OrderDetailsPage({ params, searchParams }: Props) {
  const user = await requireArea("CUSTOMER");
  const raw = (await params).orderNumber;
  const number = /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  const order = Number.isSafeInteger(number) ? await getCustomerOrder(number, user.id) : null;
  if (!order) notFound();

  const tabParam = (await searchParams).tab;
  const tab: OrderTab = ORDER_TABS.some((t) => t.key === tabParam) ? (tabParam as OrderTab) : "summary";
  const statuses = order.storeOrders.map((s) => s.status);
  const productCounts = tab === "vendor" ? await visibleProductCounts(order.storeOrders.map((s) => s.vendor.id)) : {};
  const reviews = tab === "reviews" ? await reviewsForItems(order.storeOrders.flatMap((s) => s.items.map((i) => i.id)), user.id) : {};

  return (
    <AccountCard>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="tabular-nums">Order #{order.orderNumber}</span>
            <OrderStatusBadge status={customerOrderStatus(statuses)} />
          </h1>
          <p className="mt-1 text-sm text-fg-subtle tabular-nums">
            <time dateTime={order.createdAt.toISOString()}>{placedAt.format(order.createdAt)}</time>
          </p>
        </div>
        <a
          href={invoiceHref(order.orderNumber)}
          download
          aria-label={`Download invoice for order #${order.orderNumber}`}
          title="Download invoice"
          className="grid size-12 shrink-0 place-items-center rounded-md bg-primary !text-on-primary shadow-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover"
        >
          <FileDown aria-hidden className="size-5" strokeWidth={2} />
        </a>
      </div>

      <OrderTabs base={accountOrderHref(order.orderNumber)} active={tab} />

      <div className="pt-6">
        {tab === "summary" && <SummaryTab order={order} canCancel={canCustomerCancel(statuses)} />}
        {tab === "vendor" && <VendorTab order={order} productCounts={productCounts} />}
        {tab === "delivery" && <DeliveryTab />}
        {tab === "reviews" && <ReviewsTab order={order} reviews={reviews} />}
        {tab === "track" && <TrackTab order={order} />}
      </div>
    </AccountCard>
  );
}
