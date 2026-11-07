import { CreditCard, MapPin, ReceiptText, Store, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { Facts, SideCard } from "@/components/orders/DetailCards";
import { OrderProgressNote, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { getAdminOrder } from "@/lib/admin-orders.server";
import { SHIPPING_METHOD_INFO, taxLabel } from "@/lib/checkout";
import { money, moneyOff } from "@/lib/money";
import {
  addressLines,
  canceledPartsTotal,
  commissionState,
  customerOrderStatus,
  orderAddress,
  orderProgressNote,
  PAYMENT_METHOD_LABEL,
  paymentLabel,
  PAYMENT_STATUS_TONE,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

type Order = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
type Part = Order["storeOrders"][number];

const placed = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const at = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function Address({ title, a }: { title: string; a: ReturnType<typeof orderAddress> }) {
  return (
    <SideCard icon={MapPin} title={title}>
      <p className="text-sm font-semibold text-fg-strong">{a.name}</p>
      {addressLines(a).map((l) => (
        <p key={l} className="text-sm text-fg">
          {l}
        </p>
      ))}
      <p className="mt-2 text-sm text-fg-muted tabular-nums">{a.phone}</p>
      {a.email && <p className="text-sm break-all text-fg-muted">{a.email}</p>}
    </SideCard>
  );
}

/** Commission on one store's part, per the rule (charged when delivered, est. on the way, — otherwise). */
function Commission({ p }: { p: Part }) {
  const state = commissionState(p.status);
  if (state === "not-charged") return <span className="text-fg-subtle">— not charged</span>;
  return (
    <span>
      {moneyOff(p.commission)}
      {state === "estimated" && <span className="text-caption font-semibold text-fg-subtle"> est.</span>}
    </span>
  );
}

/** One store's part: header (store, status, payment), its items, its totals. */
function StoreBlock({ p, index, of, method }: { p: Part; index: number; of: number; method: keyof typeof PAYMENT_METHOD_LABEL }) {
  const canceled = p.status === "CANCELED";
  return (
    <section aria-label={`Part from ${p.vendor.storeName}`} className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-iris-50 px-5 py-3.5">
        <Store aria-hidden className="size-4.5 text-primary" strokeWidth={1.9} />
        <span className="text-sm text-fg-muted">
          Store {index + 1} of {of} ·
        </span>
        <Link href={`/admin/vendors/${p.vendor.id}`} className="inline-flex min-h-11 items-center text-sm font-bold !text-primary hover:underline lg:min-h-0">
          {p.vendor.storeName}
        </Link>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={p.status} />
          {(!canceled || p.paymentStatus === "REFUNDED") && <Badge tone={PAYMENT_STATUS_TONE[p.paymentStatus]}>{paymentLabel(method, p.paymentStatus)}</Badge>}
        </span>
      </header>

      <div className="hidden md:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead>Item</TableHead>
              <TableHead className="w-14 text-center">Qty</TableHead>
              <TableHead className="w-26 text-right">Unit price</TableHead>
              <TableHead className="w-24 text-right">Discount</TableHead>
              <TableHead className="w-26 text-right">Line total</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {p.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <Item it={it} />
                </TableCell>
                <TableCell className="text-center tabular-nums">{it.qty}</TableCell>
                <TableCell className="text-right tabular-nums">{money(it.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{moneyOff(it.discount)}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{money(it.unitPrice * it.qty - it.discount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul role="list" aria-label={`Items from ${p.vendor.storeName}`} className="flex flex-col divide-y divide-line px-5 md:hidden">
        {p.items.map((it) => (
          <li key={it.id} className="py-4">
            <Item it={it} />
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              {(
                [
                  ["Qty", it.qty],
                  ["Unit price", money(it.unitPrice)],
                  ["Line total", money(it.unitPrice * it.qty - it.discount)],
                ] as [string, ReactNode][]
              ).map(([label, v]) => (
                <div key={label}>
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="font-semibold text-fg-strong tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <dl className="flex flex-wrap justify-end gap-x-5 gap-y-1.5 border-t border-line bg-sunken px-5 py-3.5 text-caption text-fg-muted tabular-nums">
        <div>
          <dt className="inline">Items: </dt>
          <dd className="inline font-semibold text-fg-strong">{money(p.subtotal)}</dd>
        </div>
        {(p.discount > 0 || p.couponCode) && (
          <div>
            <dt className="inline">Coupon{p.couponCode ? ` ${p.couponCode}` : ""}: </dt>
            <dd className="inline font-semibold text-success-600">{p.discount > 0 ? `−${money(p.discount)}` : "Free delivery"}</dd>
          </div>
        )}
        <div>
          <dt className="inline">Shipping: </dt>
          <dd className="inline font-semibold text-fg-strong">{p.shipping === 0 ? "Free" : money(p.shipping)}</dd>
        </div>
        <div>
          <dt className="inline">Tax: </dt>
          <dd className="inline font-semibold text-fg-strong">{money(p.tax)}</dd>
        </div>
        <div>
          <dt className="inline">Commission: </dt>
          <dd className="inline font-semibold text-fg-strong">
            <Commission p={p} />
          </dd>
        </div>
        <div>
          <dt className="inline">Store total: </dt>
          <dd className={cn("inline font-bold text-fg-strong", canceled && "text-fg-muted line-through")}>{money(p.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Item({ it }: { it: Part["items"][number] }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={it.image} name={it.productName} size={44} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{it.productName}</p>
        <p className="text-caption text-fg-muted">{[it.variationName, it.sku && `SKU ${it.sku}`].filter(Boolean).join(" · ") || "—"}</p>
      </div>
    </div>
  );
}

/**
 * Admin › Order details — the WHOLE order, read-only: one block per store (its own status, payment,
 * items, coupon, totals and commission), the order totals, the customer and both addresses. Stores
 * move their own parts; the admin oversees.
 */
export function AdminOrderDetail({ order }: { order: Order }) {
  const statuses = order.storeOrders.map((s) => s.status);
  const canceled = canceledPartsTotal(order.storeOrders);
  const units = order.storeOrders.reduce((n, s) => n + s.items.reduce((m, i) => m + i.qty, 0), 0);
  const sameBilling = order.billingSameAsShipping || !order.billName;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        {order.storeOrders.map((p, i) => (
          <StoreBlock key={p.id} p={p} index={i} of={order.storeOrders.length} method={order.paymentMethod} />
        ))}

        <section aria-label="Order totals" className="w-full rounded-lg bg-card p-5 shadow-sm md:ml-auto md:max-w-md">
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-sm">
            {(
              [
                [`Items (${units})`, money(order.subtotal)],
                ["Coupon discounts", moneyOff(order.discount)],
                [`Shipping · ${SHIPPING_METHOD_INFO[order.shippingMethod].label}`, order.shipping === 0 ? "Free" : money(order.shipping)],
                [taxLabel(order.taxRegion, order.taxRate), money(order.tax)],
                ...(canceled > 0 ? ([["Canceled stores", `−${money(canceled)}`]] as [string, string][]) : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-fg-muted">{label}</dt>
                <dd className={cn("text-right font-semibold tabular-nums", label === "Canceled stores" ? "text-error-600" : "text-fg-strong")}>{value}</dd>
              </div>
            ))}
            <div aria-hidden className="col-span-2 mt-1 border-t border-line" />
            <div className="contents">
              <dt className="self-center font-bold text-fg-strong">Grand total</dt>
              <dd className="text-right font-display text-xl font-extrabold text-primary tabular-nums">{money(order.total - canceled)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <SideCard icon={ReceiptText} title="Order info">
          <Facts
            rows={[
              ["Order", <span key="n" className="tabular-nums">#{order.orderNumber}</span>],
              ["Placed", <span key="d" className="tabular-nums">{placed.format(order.createdAt)} · {at.format(order.createdAt)}</span>],
              [
                "Status",
                <span key="s" className="inline-flex flex-col items-end gap-1">
                  <OrderStatusBadge status={customerOrderStatus(statuses)} />
                  <OrderProgressNote note={orderProgressNote(statuses)} />
                </span>,
              ],
              ["Stores", order.storeOrders.length],
            ]}
          />
        </SideCard>

        <SideCard icon={CreditCard} title="Payment">
          <Facts
            rows={[
              ["Method", PAYMENT_METHOD_LABEL[order.paymentMethod]],
              ["Status", <Badge key="p" tone={PAYMENT_STATUS_TONE[order.paymentStatus]}>{paymentLabel(order.paymentMethod, order.paymentStatus, order.storeOrders.every((s) => s.status === "CANCELED"))}</Badge>],
              ...(order.stripePaymentIntentId ? [["Stripe payment", <span key="pi" className="font-mono text-caption break-all">{order.stripePaymentIntentId}</span>] as [string, ReactNode]] : []),
              ["Grand total", <span key="t" className="tabular-nums">{money(order.total - canceled)}</span>],
            ]}
          />
          <p className="mt-3 text-caption text-fg-muted">Paid once every store&apos;s part is paid — each store&apos;s own status is shown on its block.</p>
        </SideCard>

        <SideCard icon={UserRound} title="Customer">
          <Facts
            rows={[
              ["Name", order.customer.name],
              ["Email", <span key="e" className="break-all">{order.customer.email}</span>],
              ["Phone", <span key="p" className="tabular-nums">{order.customer.phone || order.shipPhone}</span>],
              ["Customer since", placed.format(order.customer.createdAt)],
            ]}
          />
        </SideCard>

        <SideCard icon={Truck} title="Delivery">
          <Facts rows={[["Method", SHIPPING_METHOD_INFO[order.shippingMethod].label], ["Estimated", SHIPPING_METHOD_INFO[order.shippingMethod].eta]]} />
          {order.note && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-fg">
              <span className="font-semibold text-fg-strong">Note: </span>
              {order.note}
            </p>
          )}
        </SideCard>

        <Address title="Shipping address" a={orderAddress(order, "ship")} />
        {sameBilling ? (
          <SideCard icon={MapPin} title="Billing address">
            <p className="text-sm text-fg-muted">Same as shipping address.</p>
          </SideCard>
        ) : (
          <Address title="Billing address" a={orderAddress(order, "bill")} />
        )}
      </div>
    </div>
  );
}
