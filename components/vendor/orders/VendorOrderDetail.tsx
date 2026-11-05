import { CreditCard, Download, History, MapPin, ReceiptText, Store, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { Facts, SideCard } from "@/components/orders/DetailCards";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SHIPPING_METHOD_INFO, taxLabel } from "@/lib/checkout";
import { money } from "@/lib/money";
import { addressLines, ORDER_STATUS_LABEL, orderAddress, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, vendorInvoiceHref } from "@/lib/orders";
import type { OrderView } from "@/lib/orders.server";
import { cn } from "@/lib/utils";
import { OrderStatusControl } from "./OrderStatusControl";

const placed = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const at = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function AddressCard({ title, a }: { title: string; a: ReturnType<typeof orderAddress> }) {
  const [street, city, country] = addressLines(a);
  return (
    <SideCard icon={MapPin} title={title}>
      <Facts
        rows={[
          ["Name", a.name],
          ...(a.phone ? ([["Contact", <span key="p" className="tabular-nums">{a.phone}</span>]] as [string, ReactNode][]) : []),
          ["Address", street],
          ["City", city],
          ["Country", country],
        ]}
      />
    </SideCard>
  );
}

/**
 * Seller Center › Order details (vendororderdetails design): this store's part of a customer order —
 * its items and totals, payment, the status control, and where it ships. `order` comes from
 * getVendorOrderView (already trimmed to this store, contact details masked).
 */
export function VendorOrderDetail({ order }: { order: OrderView }) {
  const part = order.storeOrders[0]!;
  const itemsPrice = part.items.reduce((n, i) => n + i.unitPrice * i.qty, 0);
  const sameBilling = order.billingSameAsShipping || !order.billName;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Items + totals */}
      <section aria-label={`Order #${order.orderNumber}`} className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-extrabold text-fg-strong tabular-nums">Order #{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-fg-muted tabular-nums">
              <time dateTime={part.createdAt.toISOString()}>
                {placed.format(part.createdAt)} · {at.format(part.createdAt)}
              </time>
            </p>
          </div>
          <Button asChild variant="secondary" className="max-sm:w-full">
            <a href={vendorInvoiceHref(part.id)} download>
              <Download aria-hidden />
              Print Invoice
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line bg-sunken px-5 py-3.5 text-sm sm:px-6">
          <span className="flex items-center gap-2 text-fg-muted">
            Status <OrderStatusBadge status={part.status} />
          </span>
          <span className="flex items-center gap-2 text-fg-muted">
            <Store aria-hidden className="size-4 text-primary" strokeWidth={2} />
            Sold by <b className="text-fg-strong">{part.vendor.storeName}</b>
          </span>
        </div>

        {/* Items: table from 768px, stacked below */}
        <div className="hidden md:block">
          <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <tr>
                <TableHead className="w-12">SL</TableHead>
                <TableHead>Item Details</TableHead>
                <TableHead className="w-14 text-center">Qty</TableHead>
                <TableHead className="w-26 text-right">Item Price</TableHead>
                <TableHead className="w-24 text-right">Discount</TableHead>
                <TableHead className="w-24 text-right">Total</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {part.items.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell className="text-fg-muted tabular-nums">{i + 1}</TableCell>
                  <TableCell>
                    <ItemName it={it} />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{it.qty}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(it.unitPrice * it.qty)}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.discount > 0 ? `−${money(it.discount)}` : money(0)}</TableCell>
                  <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{money(it.unitPrice * it.qty - it.discount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul role="list" aria-label="Items" className="flex flex-col divide-y divide-line px-5 md:hidden">
          {part.items.map((it) => (
            <li key={it.id} className="py-4">
              <ItemName it={it} />
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                {(
                  [
                    ["Qty", it.qty],
                    ["Discount", it.discount > 0 ? `−${money(it.discount)}` : money(0)],
                    ["Total", money(it.unitPrice * it.qty - it.discount)],
                  ] as [string, ReactNode][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                    <dd className="font-semibold text-fg-strong tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <div className="flex justify-end border-t border-line p-5 sm:p-6">
          <dl className="grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-sm">
            {(
              [
                ["Item price", money(itemsPrice)],
                ["Sub total", money(part.subtotal)],
                [`Coupon discount${part.couponCode ? ` (${part.couponCode})` : ""}`, part.discount > 0 ? `−${money(part.discount)}` : money(0)],
                [taxLabel(order.taxRegion, order.taxRate), money(part.tax)],
                ["Shipping fee", part.shipping === 0 ? "Free" : money(part.shipping)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-fg-muted">{label}</dt>
                <dd className="text-right font-semibold text-fg-strong tabular-nums">{value}</dd>
              </div>
            ))}
            <div aria-hidden className="col-span-2 mt-1 border-t border-line" />
            <div className="contents">
              <dt className="self-center font-bold text-fg-strong">Total</dt>
              <dd className="text-right font-display text-lg font-extrabold text-primary tabular-nums">{money(part.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Side column */}
      <div className="flex min-w-0 flex-col gap-5">
        <SideCard icon={CreditCard} title="Payment" aside={<PayBadge status={order.paymentStatus} />}>
          <Facts
            rows={[
              ["Payment method", PAYMENT_METHOD_LABEL[order.paymentMethod]],
              ["Order amount", <span key="a" className="tabular-nums">{money(part.total)}</span>],
              ...(part.paidAt ? ([["Paid on", <span key="p" className="tabular-nums">{placed.format(part.paidAt)}</span>]] as [string, ReactNode][]) : []),
            ]}
          />
          {order.paymentMethod === "COD" && part.paymentStatus === "UNPAID" && (
            <p className="mt-3 text-caption text-fg-muted">Cash is collected when this part is delivered — it&apos;s marked paid automatically then.</p>
          )}
        </SideCard>

        <SideCard icon={Truck} title="Order & Shipping Info">
          <OrderStatusControl key={part.status} id={part.id} orderNumber={order.orderNumber} status={part.status} />
          <div className="mt-4 border-t border-line pt-4">
            <Facts
              rows={[
                ["Payment status", PAYMENT_STATUS_LABEL[order.paymentStatus]],
                ["Shipping method", SHIPPING_METHOD_INFO[order.shippingMethod].label],
              ]}
            />
          </div>
          <p className="mt-4 rounded-md bg-sunken p-3.5 text-caption text-fg-muted">
            This order uses Sundry&apos;s in-house shipping and must be delivered with the option the customer chose at checkout.
          </p>
        </SideCard>

        <SideCard icon={History} title="Status history">
          <StatusHistory events={part.events} />
        </SideCard>

        {order.note && (
          <SideCard icon={ReceiptText} title="Order note">
            <p className="text-sm whitespace-pre-line text-fg">{order.note}</p>
          </SideCard>
        )}
        <AddressCard title="Shipping address" a={orderAddress(order, "ship")} />
        {sameBilling ? (
          <SideCard icon={MapPin} title="Billing address">
            <p className="text-sm text-fg-muted">Same as shipping address.</p>
          </SideCard>
        ) : (
          <AddressCard title="Billing address" a={orderAddress(order, "bill")} />
        )}
      </div>
    </div>
  );
}

const BY: Record<string, string> = { VENDOR: "by your store", CUSTOMER: "by the customer", ADMIN: "by Sundry" };

/** This part's moves, newest first, with when and who (older orders only have the steps that were recorded). */
function StatusHistory({ events }: { events: OrderView["storeOrders"][number]["events"] }) {
  if (events.length === 0) return <p className="text-sm text-fg-muted">No status changes recorded yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {[...events].reverse().map((e, i) => (
        <li key={`${e.status}-${e.createdAt.toISOString()}-${i}`} className="flex items-start gap-3">
          <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", i === 0 ? "bg-primary" : "bg-line-default")} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-fg-strong">
              {ORDER_STATUS_LABEL[e.status]}
              {e.actorRole && <span className="font-normal text-fg-muted"> {BY[e.actorRole]}</span>}
            </p>
            <time dateTime={e.createdAt.toISOString()} className="text-caption text-fg-muted tabular-nums">
              {placed.format(e.createdAt)} · {at.format(e.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PayBadge({ status }: { status: OrderView["paymentStatus"] }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-bold", status === "PAID" ? "bg-success-50 text-success-600" : "bg-sunken text-fg-muted")}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

function ItemName({ it }: { it: OrderView["storeOrders"][number]["items"][number] }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={it.image} name={it.productName} size={48} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-fg-strong" title={it.productName}>
          {it.productName}
        </p>
        <p className="text-caption text-fg-muted">
          {[it.variationName, it.sku && `SKU ${it.sku}`, `Unit price ${money(it.unitPrice)}`].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
