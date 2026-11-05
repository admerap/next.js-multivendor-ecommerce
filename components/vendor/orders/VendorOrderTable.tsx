import { Download, Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/money";
import { orderDate, PAYMENT_STATUS_LABEL, vendorInvoiceHref, vendorOrderHref } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { VendorOrderRow } from "@/lib/vendor-orders.server";

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function Actions({ o }: { o: VendorOrderRow }) {
  return (
    <>
      <Link
        href={vendorOrderHref(o.id)}
        aria-label={`View order #${o.orderNumber}`}
        title="View order"
        className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      {/* A plain download link: the route streams this store's part as a PDF (no JS needed). */}
      <a
        href={vendorInvoiceHref(o.id)}
        download
        aria-label={`Download invoice for order #${o.orderNumber}`}
        title="Download invoice"
        className={cn(iconActionClass, "border-iris-100 bg-iris-50 !text-primary hover:bg-primary hover:!text-on-primary")}
      >
        <Download aria-hidden className="size-4" strokeWidth={2} />
      </a>
    </>
  );
}

/** `linked`: the number links to the details in the desktop table; the cards use their 44px View button instead. */
function OrderId({ o, linked = false }: { o: VendorOrderRow; linked?: boolean }) {
  return (
    <>
      {linked ? (
        <Link href={vendorOrderHref(o.id)} className="text-sm font-bold !text-primary tabular-nums hover:underline">
          #{o.orderNumber}
        </Link>
      ) : (
        <p className="text-sm font-bold text-primary tabular-nums">#{o.orderNumber}</p>
      )}
      <p className="mt-0.5 text-caption text-fg-muted tabular-nums">
        {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
      </p>
    </>
  );
}

const PlacedAt = ({ o }: { o: VendorOrderRow }) => (
  <time dateTime={o.createdAt.toISOString()} className="block text-sm text-fg tabular-nums">
    {orderDate(o.createdAt)}
    <span className="block text-caption text-fg-muted">{time.format(o.createdAt)}</span>
  </time>
);

const Customer = ({ o }: { o: VendorOrderRow }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold text-fg-strong" title={o.customerName}>
      {o.customerName}
    </p>
    <p className="truncate text-caption text-fg-muted tabular-nums">{o.customerPhone}</p>
  </div>
);

const Amount = ({ o }: { o: VendorOrderRow }) => (
  <div>
    <p className="text-sm font-bold text-fg-strong tabular-nums">{money(o.total)}</p>
    <p className={cn("text-caption font-semibold", o.paymentStatus === "PAID" ? "text-success-600" : "text-fg-muted")}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</p>
  </div>
);

/**
 * Seller Center order list (vendororderlist design): SL · Order ID · Order Date · Customer Info ·
 * Total Amount · Order Status · Action. Each row is this store's part of a customer order (its
 * StoreOrder), so the amount is this store's total only. Table from 1201px, labelled cards below.
 */
export function VendorOrderTable({ items, offset }: { items: VendorOrderRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead className="w-[14%]">Order ID</TableHead>
              <TableHead className="w-[16%]">Order Date</TableHead>
              <TableHead>Customer Info</TableHead>
              <TableHead className="w-[15%] text-right">Total Amount</TableHead>
              <TableHead className="w-[16%] text-center">Order Status</TableHead>
              <TableHead className="w-28 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((o, i) => (
              <TableRow key={o.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <OrderId o={o} linked />
                </TableCell>
                <TableCell>
                  <PlacedAt o={o} />
                </TableCell>
                <TableCell>
                  <Customer o={o} />
                </TableCell>
                <TableCell className="text-right">
                  <Amount o={o} />
                </TableCell>
                <TableCell className="text-center">
                  <OrderStatusBadge status={o.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Actions o={o} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Orders" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {items.map((o, i) => (
          <li key={o.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <OrderId o={o} />
              </div>
              <OrderStatusBadge status={o.status} />
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {(
                [
                  ["Customer", <Customer key="c" o={o} />],
                  ["Order date", <PlacedAt key="d" o={o} />],
                  ["Total", <Amount key="t" o={o} />],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 flex justify-end gap-2 border-t border-line pt-3.5">
              <Actions o={o} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
