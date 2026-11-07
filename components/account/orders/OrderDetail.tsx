import { BadgeCheck, Ban, Check, MapPin, Package, Star, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { SHIPPING_METHOD_INFO, taxLabel } from "@/lib/checkout";
import { money } from "@/lib/money";
import {
  addressLines,
  canceledPartsTotal,
  canCustomerCancelPart,
  orderAddress,
  awaitingCardPayment,
  PAYMENT_METHOD_LABEL,
  paymentLabel,
  type OrderStatusKey,
} from "@/lib/orders";
import type { OrderView } from "@/lib/orders.server";
import { productHref, sellerHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { REVIEW_STATUS_LABEL } from "@/lib/validations/review";
import { CancelOrderButton, CancelPartButton } from "./CancelOrderDialog";
import { ReviewForm } from "./ReviewForm";

export const ORDER_TABS = [
  { key: "summary", label: "Order summary" },
  { key: "vendor", label: "Vendor info" },
  { key: "delivery", label: "Delivery man info" },
  { key: "reviews", label: "Reviews" },
  { key: "track", label: "Track order" },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["key"];

type StoreOrder = OrderView["storeOrders"][number];

/** Tab bar (userorderdetails design). Links, so a tab can be bookmarked, shared or reloaded. */
export function OrderTabs({ base, active }: { base: string; active: OrderTab }) {
  return (
    <nav aria-label="Order sections" className="-mx-1 overflow-x-auto border-b border-line px-1">
      <ul className="flex gap-1">
        {ORDER_TABS.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.key === "summary" ? base : `${base}?tab=${t.key}`}
                aria-current={on ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px inline-flex min-h-12 items-center border-b-2 px-3.5 text-[0.94rem] font-semibold whitespace-nowrap transition-colors duration-(--dur-fast)",
                  on ? "border-primary !text-primary" : "border-transparent !text-fg-muted hover:!text-fg-strong",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const panel = "rounded-lg bg-sunken p-5";
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-sm">
    <dt className="text-fg-muted">{label}</dt>
    <dd className="text-right font-semibold text-fg-strong">{children}</dd>
  </div>
);

function SellerHeader({ s, children }: { s: StoreOrder; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line bg-iris-50 px-5 py-3">
      <Store aria-hidden className="size-4.5 text-primary" strokeWidth={1.9} />
      <span className="text-sm font-semibold text-fg-strong">Sold by</span>
      <Link href={sellerHref(s.vendor.slug)} className="inline-flex min-h-11 items-center text-sm font-bold !text-primary hover:underline lg:min-h-0">
        {s.vendor.storeName}
      </Link>
      {s.vendor.status === "APPROVED" && (
        <span className="inline-flex items-center gap-1 text-caption font-semibold text-success-600">
          <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2.2} />
          Verified Seller
        </span>
      )}
      <span className="ml-auto">{children ?? <OrderStatusBadge status={s.status} />}</span>
    </header>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
      {src ? <Image src={src} alt="" fill sizes="52px" className="object-cover" /> : <Package aria-hidden className="size-6 text-iris-400" strokeWidth={1.5} />}
    </span>
  );
}

/**
 * Order summary tab: info, addresses, one item table per seller (cards ≤1280), totals, Cancel — the
 * whole order, or one seller's items while that seller hasn't started packing.
 */
export function SummaryTab({ order, canCancel }: { order: OrderView; canCancel: boolean }) {
  const ship = orderAddress(order, "ship");
  const items = order.storeOrders.flatMap((s) => s.items);
  const units = items.reduce((n, i) => n + i.qty, 0);
  const itemDiscount = 0; // product discounts are already in the unit price
  const method = SHIPPING_METHOD_INFO[order.shippingMethod];
  const statuses = order.storeOrders.map((s) => s.status);
  const allCanceled = statuses.every((s) => s === "CANCELED");
  const canceledAmount = canceledPartsTotal(order.storeOrders);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="order-info" className={panel}>
          <h2 id="order-info" className="mb-3 font-bold text-fg-strong">
            Order Info
          </h2>
          <dl className="flex flex-col gap-1.5">
            <Row label="Payment Method">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</Row>
            <Row label="Payment Status">
              <span className={order.paymentStatus === "PAID" ? "text-success-600" : awaitingCardPayment(order.paymentMethod, order.paymentStatus, allCanceled) ? "text-warning-600" : "text-error-600"}>
                {paymentLabel(order.paymentMethod, order.paymentStatus, allCanceled)}
              </span>
            </Row>
            <Row label="Sellers">{order.storeOrders.length}</Row>
          </dl>
        </section>
        <section aria-labelledby="order-delivery" className={panel}>
          <h2 id="order-delivery" className="mb-3 font-bold text-fg-strong">
            Delivery
          </h2>
          <dl className="flex flex-col gap-1.5">
            <Row label="Method">{method.label}</Row>
            <Row label="Estimated">{method.eta}</Row>
          </dl>
          {order.note && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-fg">
              <span className="font-semibold text-fg-strong">Note: </span>
              {order.note}
            </p>
          )}
        </section>
        <section aria-labelledby="ship-address" className="rounded-lg border border-line p-5">
          <h2 id="ship-address" className="mb-3 flex items-center gap-2 font-bold text-fg-strong">
            <MapPin aria-hidden className="size-4.5 text-primary" strokeWidth={1.9} />
            Shipping Address
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-fg-muted">Name</dt>
            <dd className="text-fg-strong">{ship.name}</dd>
            <dt className="text-fg-muted">Phone</dt>
            <dd className="text-fg-strong">{ship.phone}</dd>
            <dt className="text-fg-muted">Email</dt>
            <dd className="min-w-0 break-words text-fg-strong">{ship.email}</dd>
            <dt className="text-fg-muted">Address</dt>
            <dd className="text-fg-strong">
              {addressLines(ship).map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </dd>
          </dl>
        </section>
        <section aria-labelledby="bill-address" className="rounded-lg border border-line p-5">
          <h2 id="bill-address" className="mb-3 font-bold text-fg-strong">
            Billing Address
          </h2>
          {order.billingSameAsShipping ? (
            <p className="text-sm text-fg-muted">Same as shipping address</p>
          ) : (
            <div className="text-sm text-fg-strong">
              <span className="block font-semibold">{orderAddress(order, "bill").name}</span>
              <span className="block text-fg-muted">{orderAddress(order, "bill").phone}</span>
              {addressLines(orderAddress(order, "bill")).map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {order.storeOrders.map((s) => (
        <section key={s.id} aria-label={`Items from ${s.vendor.storeName}`} className="overflow-hidden rounded-lg border border-line">
          <SellerHeader s={s} />
          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_4rem_6.5rem_6.5rem_7rem] gap-3 bg-sunken px-5 py-3 text-caption font-bold tracking-[0.04em] text-fg-muted uppercase xl:grid" aria-hidden>
            <span>SL</span>
            <span>Item list</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">Discount</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-line">
            {s.items.map((it, i) => (
              <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 xl:grid-cols-[2.5rem_minmax(0,1fr)_4rem_6.5rem_6.5rem_7rem]">
                <span className="hidden text-sm text-fg-muted tabular-nums xl:block">{i + 1}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <Thumb src={it.image} />
                  <div className="min-w-0">
                    {it.productSlug ? (
                      <Link href={productHref(it.productSlug)} className="line-clamp-2 text-sm font-semibold !text-fg-strong hover:!text-primary max-lg:py-3">
                        {it.productName}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{it.productName}</p>
                    )}
                    {it.variationName && <p className="text-caption text-fg-muted">{it.variationName}</p>}
                    <p className="text-caption text-fg-muted tabular-nums">
                      Unit Price: {money(it.unitPrice)}
                      <span className="xl:hidden"> × {it.qty}</span>
                    </p>
                  </div>
                </div>
                <span className="hidden text-center text-sm text-fg-strong tabular-nums xl:block">{it.qty}</span>
                <span className="hidden text-right text-sm text-fg-strong tabular-nums xl:block">{money(it.unitPrice * it.qty)}</span>
                <span className="hidden text-right text-sm text-success-600 tabular-nums xl:block">{it.discount > 0 ? `− ${money(it.discount)}` : money(0)}</span>
                <span className="text-right font-bold text-fg-strong tabular-nums">
                  {money(it.lineTotal)}
                  {it.discount > 0 && <span className="block text-caption font-semibold text-success-600 xl:hidden">− {money(it.discount)}</span>}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-wrap justify-end gap-x-5 gap-y-1 border-t border-line bg-sunken px-5 py-3 text-caption text-fg-muted tabular-nums">
            {s.discount > 0 && (
              <div>
                <dt className="inline">Coupon{s.couponCode ? ` ${s.couponCode}` : ""}: </dt>
                <dd className="inline font-semibold text-success-600">− {money(s.discount)}</dd>
              </div>
            )}
            <div>
              <dt className="inline">Shipping: </dt>
              <dd className="inline font-semibold text-fg-strong">{s.shipping === 0 ? "Free" : money(s.shipping)}</dd>
            </div>
            <div>
              <dt className="inline">Tax: </dt>
              <dd className="inline font-semibold text-fg-strong">{money(s.tax)}</dd>
            </div>
            {(s.status !== "CANCELED" || s.paymentStatus === "REFUNDED") && (
              <div>
                <dt className="inline">Payment: </dt>
                <dd className={cn("inline font-semibold", s.paymentStatus === "PAID" ? "text-success-600" : "text-fg-strong")}>{paymentLabel(order.paymentMethod, s.paymentStatus)}</dd>
              </div>
            )}
            <div>
              <dt className="inline">Subtotal from {s.vendor.storeName}: </dt>
              <dd className={cn("inline font-bold text-fg-strong", s.status === "CANCELED" && canceledAmount > 0 && "text-fg-muted line-through")}>{money(s.total)}</dd>
            </div>
          </dl>
          {canCustomerCancelPart(statuses, s.status) && (
            <div className="flex justify-end border-t border-line px-3 py-1.5">
              <CancelPartButton orderNumber={order.orderNumber} part={{ id: s.id, storeName: s.vendor.storeName, total: s.total }} />
            </div>
          )}
        </section>
      ))}

      <section aria-label="Order total" className="w-full rounded-lg bg-sunken p-5 md:ml-auto md:max-w-95">
        <dl className="flex flex-col gap-2">
          <Row label="Total Item">{units}</Row>
          <Row label="Item price">{money(order.subtotal)}</Row>
          <Row label="Item discount">{money(itemDiscount)}</Row>
          <Row label="Subtotal">{money(order.subtotal - itemDiscount)}</Row>
          <Row label="Coupon discount">
            <span className="text-success-600">− {money(order.discount)}</span>
          </Row>
          <Row label={taxLabel(order.taxRegion, order.taxRate)}>{money(order.tax)}</Row>
          <Row label={order.shippingMethod === "EXPRESS" ? "Shipping Fee (Express)" : "Shipping Fee"}>{order.shipping === 0 ? "Free" : money(order.shipping)}</Row>
          {canceledAmount > 0 && (
            <Row label="Canceled items">
              <span className="text-error-600">− {money(canceledAmount)}</span>
            </Row>
          )}
        </dl>
        <div className="my-3.5 h-px bg-line" />
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg font-bold text-primary">Total</span>
          <span className="font-display text-[1.375rem] font-extrabold text-primary tabular-nums">{money(order.total - canceledAmount)}</span>
        </div>
        {canCancel && <CancelOrderButton orderNumber={order.orderNumber} className="mt-4" />}
      </section>
    </div>
  );
}

/** Vendor info tab: one card per seller in the order. */
export function VendorTab({ order, productCounts }: { order: OrderView; productCounts: Record<string, number> }) {
  return (
    <ul className="flex flex-col gap-4">
      {order.storeOrders.map((s) => {
        const v = s.vendor;
        const n = productCounts[v.id] ?? 0;
        return (
          <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-5">
            <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-iris-50">
              {v.logo ? <Image src={v.logo} alt="" fill sizes="64px" className="object-cover" /> : <Store aria-hidden className="size-7 text-primary" strokeWidth={1.7} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-display text-lg font-extrabold text-fg-strong">{v.storeName}</span>
                {v.status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1 text-caption font-semibold text-success-600">
                    <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2.2} />
                    Verified Seller
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                <b className="font-semibold text-fg-strong tabular-nums">{n}</b> {n === 1 ? "Product" : "Products"}
                <span aria-hidden> · </span>
                {v.storeAddress}
              </p>
            </div>
            {v.status === "APPROVED" && (
              <Button asChild className="max-sm:w-full">
                <Link href={sellerHref(v.slug)}>
                  <Store aria-hidden />
                  Visit Store
                </Link>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Delivery man info tab. Couriers aren't tracked in Sundry yet, so it says so instead of inventing one. */
export function DeliveryTab() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-5">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-warning-50">
        <Truck aria-hidden className="size-7 text-warning-600" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-extrabold text-fg-strong">No delivery partner assigned yet</p>
        <p className="mt-1 text-sm text-fg-muted">Each seller ships their part separately. When a courier is assigned, their name and contact will appear here.</p>
      </div>
    </div>
  );
}

/** text: once reached · waiting: still ahead (the userorderdetails / usertrackorder copy). */
const STEPS: { key: OrderStatusKey; title: string; text: (store: string) => string; waiting: (store: string) => string }[] = [
  { key: "PENDING", title: "Order Placed", text: () => "Your order has been received.", waiting: () => "Your order has been received." },
  { key: "CONFIRMED", title: "Order Confirmed", text: (s) => `${s} accepted your order.`, waiting: (s) => `Waiting for ${s} to confirm.` },
  { key: "PACKAGING", title: "Packed", text: (s) => `${s} is packing your items.`, waiting: () => "Not packed yet." },
  { key: "OUT_FOR_DELIVERY", title: "Out for Delivery", text: () => "On its way to your address.", waiting: () => "Not shipped yet." },
  { key: "DELIVERED", title: "Delivered", text: () => "Delivered — enjoy your purchase!", waiting: () => "Awaiting delivery confirmation." },
];
const placed = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** When a seller's part last reached `status`, from its history (older orders may not have every step). */
const reachedAt = (s: StoreOrder, status: OrderStatusKey) => s.events.findLast((e) => e.status === status)?.createdAt;

/**
 * Track order tab: a progress line per seller (each ships separately), each reached step with its
 * date. A part that ended (canceled / returned / failed) shows the steps it actually went through.
 */
export function TrackTab({ order, withItems = false }: { order: OrderView; withItems?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {order.storeOrders.map((s) => {
        const reached = STEPS.findIndex((st) => st.key === s.status);
        const ended = s.status === "CANCELED" || s.status === "RETURNED" || s.status === "FAILED";
        const steps = ended ? STEPS.filter((st, i) => i === 0 || reachedAt(s, st.key)) : STEPS;
        const endedAt = ended ? reachedAt(s, s.status) : undefined;
        return (
          <section key={s.id} aria-label={`Progress from ${s.vendor.storeName}`} className="overflow-hidden rounded-lg border border-line">
            <SellerHeader s={s} />
            {withItems && (
              <ul aria-label={`Items from ${s.vendor.storeName}`} className="flex flex-wrap gap-x-5 gap-y-3 border-b border-line px-5 py-3.5">
                {s.items.map((it) => (
                  <li key={it.id} className="flex min-w-0 items-center gap-2.5">
                    <Thumb src={it.image} />
                    <span className="min-w-0 text-sm">
                      <span className="line-clamp-1 font-semibold text-fg-strong">{it.productName}</span>
                      <span className="text-caption text-fg-muted tabular-nums">
                        {it.variationName && <>{it.variationName} · </>}Qty {it.qty}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ol className="flex flex-col p-5">
              {steps.map((st, i) => {
                const done = ended || i <= reached;
                // Delivered is the finish line: shown as done (✓), not "in progress".
                const current = !ended && i === reached && s.status !== "DELIVERED";
                const at = done ? (reachedAt(s, st.key) ?? (i === 0 ? order.createdAt : undefined)) : undefined;
                return (
                  <li key={st.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {(i < steps.length - 1 || ended) && <span aria-hidden className={cn("absolute top-9 bottom-0 left-4 w-0.5 -translate-x-1/2", done && (i < reached || ended) ? "bg-primary" : "bg-line-default")} />}
                    <span className={cn("relative z-1 grid size-8 shrink-0 place-items-center rounded-full", done ? "bg-primary text-on-primary" : "border-2 border-line-default bg-card text-fg-subtle")}>
                      {done && !current ? <Check aria-hidden className="size-4" strokeWidth={3} /> : <span className={cn("size-2.5 rounded-full", current ? "bg-on-primary" : "bg-line-default")} />}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className={cn("font-bold", done ? "text-fg-strong" : "text-fg-muted")}>{st.title}</p>
                      <p className="text-sm text-fg-muted">{done ? st.text(s.vendor.storeName) : st.waiting(s.vendor.storeName)}</p>
                      {at && (
                        <p className="mt-0.5 text-caption text-fg-subtle tabular-nums">
                          <time dateTime={at.toISOString()}>{placed.format(at)}</time>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              {ended && (
                <li className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-error-50 text-error-600">
                    <Ban aria-hidden className="size-4" strokeWidth={2.4} />
                  </span>
                  <div className="pt-1">
                    <p className="font-bold text-fg-strong">{s.status === "CANCELED" ? "Canceled" : s.status === "RETURNED" ? "Returned" : "Delivery failed"}</p>
                    <p className="text-sm text-fg-muted">
                      {s.status === "CANCELED" ? "This part of the order was canceled." : s.status === "RETURNED" ? "The items were returned to the seller." : "The courier couldn't deliver this part."}
                    </p>
                    {endedAt && (
                      <p className="mt-0.5 text-caption text-fg-subtle tabular-nums">
                        <time dateTime={endedAt.toISOString()}>{placed.format(endedAt)}</time>
                      </p>
                    )}
                  </div>
                </li>
              )}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

export type ItemReview = {
  orderItemId: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
};

const reviewedOn = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const STATUS_PILL: Record<ItemReview["status"], string> = {
  PENDING: "bg-warning-50 text-warning-600",
  APPROVED: "bg-success-50 text-success-600",
  REJECTED: "bg-error-50 text-error-600",
};

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn(size, n <= value ? "fill-warning-500 text-warning-500" : "text-line-default")} strokeWidth={1.6} />
      ))}
    </span>
  );
}

/**
 * Reviews tab: every purchased item, grouped by seller. Delivered + not yet reviewed → the review
 * form; already reviewed → the review with its moderation status; not delivered yet → when it unlocks.
 */
export function ReviewsTab({ order, reviews }: { order: OrderView; reviews: Record<string, ItemReview> }) {
  const delivered = order.storeOrders.some((s) => s.status === "DELIVERED");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-sunken p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-warning-50">
          <Star aria-hidden className="size-6 text-warning-600" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold text-fg-strong">Rate your purchase</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {delivered
              ? "Share what you think about each item — reviews appear on the product page once our team approves them."
              : "Once your order is delivered you can leave a review for each item and help other shoppers."}
          </p>
        </div>
      </div>

      {order.storeOrders.map((s) => (
        <section key={s.id} aria-label={`Reviews for ${s.vendor.storeName}`} className="overflow-hidden rounded-lg border border-line">
          <SellerHeader s={s} />
          <ul className="divide-y divide-line">
            {s.items.map((it) => {
              const r = reviews[it.id];
              return (
                <li key={it.id} aria-label={it.productName} className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <Thumb src={it.image} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{it.productName}</p>
                      {it.variationName && <p className="text-caption text-fg-muted">{it.variationName}</p>}
                    </div>
                  </div>
                  {r ? (
                    <div className="rounded-md bg-sunken p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <Stars value={r.rating} />
                        <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-semibold", STATUS_PILL[r.status])}>{REVIEW_STATUS_LABEL[r.status]}</span>
                        <span className="text-caption text-fg-subtle">Reviewed {reviewedOn.format(r.createdAt)}</span>
                      </div>
                      {r.title && <p className="mt-2 font-semibold text-fg-strong">{r.title}</p>}
                      <p className="mt-1 text-sm whitespace-pre-line text-fg">{r.comment}</p>
                      {r.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.images.map((src, i) => (
                            <span key={src} className="relative size-16 overflow-hidden rounded-md border border-line">
                              <Image src={src} alt={`Review photo ${i + 1}`} fill sizes="64px" className="object-cover" />
                            </span>
                          ))}
                        </div>
                      )}
                      {r.status === "PENDING" && <p className="mt-3 text-caption text-fg-muted">Thanks! Our team checks every review before it appears on the product page.</p>}
                    </div>
                  ) : s.status !== "DELIVERED" ? (
                    <p className="flex items-center gap-2 rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">
                      <Package aria-hidden className="size-4 shrink-0" strokeWidth={2} />
                      You can review this once {s.vendor.storeName} delivers it.
                    </p>
                  ) : !it.productId ? (
                    <p className="rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">This product is no longer sold, so it can&apos;t be reviewed.</p>
                  ) : (
                    <ReviewForm orderItemId={it.id} productName={it.productName} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
