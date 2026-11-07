import { Download, Eye, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { OrderProgressNote, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminOrderRow } from "@/lib/admin-orders.server";
import { money } from "@/lib/money";
import { adminInvoiceHref, adminOrderHref, awaitingCardPayment, orderDate, paymentLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function Actions({ o }: { o: AdminOrderRow }) {
  return (
    <>
      <Link
        href={adminOrderHref(o.orderNumber)}
        aria-label={`View order #${o.orderNumber}`}
        title="View details"
        className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <a
        href={adminInvoiceHref(o.orderNumber)}
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

function OrderId({ o, linked = false }: { o: AdminOrderRow; linked?: boolean }) {
  return (
    <>
      {linked ? (
        <Link href={adminOrderHref(o.orderNumber)} className="text-sm font-bold !text-primary tabular-nums hover:underline">
          #{o.orderNumber}
        </Link>
      ) : (
        <p className="text-sm font-bold text-primary tabular-nums">#{o.orderNumber}</p>
      )}
      <p className="text-caption text-fg-muted tabular-nums">
        {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
      </p>
    </>
  );
}

const Placed = ({ o }: { o: AdminOrderRow }) => (
  <time dateTime={o.createdAt.toISOString()} className="block text-sm text-fg tabular-nums">
    {orderDate(o.createdAt)}
    <span className="block text-caption text-fg-muted">{time.format(o.createdAt)}</span>
  </time>
);

const Customer = ({ o }: { o: AdminOrderRow }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold text-fg-strong" title={o.customerEmail}>
      {o.customerName}
    </p>
    <p className="truncate text-caption text-fg-muted tabular-nums">{o.customerPhone}</p>
  </div>
);

/** The order's stores: the first one linked to its admin page, then "+N more" (all named in the title). */
const Stores = ({ o, linked = false }: { o: AdminOrderRow; linked?: boolean }) => {
  const [first, ...rest] = o.stores;
  if (!first) return null;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm" title={o.stores.map((s) => s.name).join(", ")}>
      <Store aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
      {linked ? (
        <Link href={`/admin/vendors/${first.id}`} className="truncate font-semibold !text-fg-strong hover:!text-primary">
          {first.name}
        </Link>
      ) : (
        <span className="truncate font-semibold text-fg-strong">{first.name}</span>
      )}
      {rest.length > 0 && <span className="shrink-0 text-caption font-semibold text-fg-muted">+{rest.length} more</span>}
    </div>
  );
};

const Total = ({ o }: { o: AdminOrderRow }) => (
  <div>
    <p className="text-sm font-bold text-fg-strong tabular-nums">{money(o.total)}</p>
    <p className={cn("text-caption font-semibold", o.paymentStatus === "PAID" ? "text-success-600" : awaitingCardPayment(o.paymentMethod, o.paymentStatus, o.status === "CANCELED") ? "text-warning-600" : "text-fg-muted")}>
      {paymentLabel(o.paymentMethod, o.paymentStatus, o.status === "CANCELED")}
    </p>
  </div>
);

const Status = ({ o }: { o: AdminOrderRow }) => (
  <div className="flex flex-col items-start gap-1">
    <OrderStatusBadge status={o.status} />
    <OrderProgressNote note={o.progressNote} />
  </div>
);

/**
 * Admin order list (adminallorders design): SL · Order ID · Order date · Customer · Store · Total ·
 * Status · Action. A multi-store order names its first store "+N more"; its status is the overall one
 * (see lib/admin-orders.server). Table from 1201px, labelled cards below.
 */
export function AdminOrderTable({ rows, offset }: { rows: AdminOrderRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead className="w-[11%]">Order ID</TableHead>
              <TableHead className="w-[13%]">Order date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-[19%]">Store</TableHead>
              <TableHead className="w-[12%] text-right">Total</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-28 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((o, i) => (
              <TableRow key={o.orderNumber}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <OrderId o={o} linked />
                </TableCell>
                <TableCell>
                  <Placed o={o} />
                </TableCell>
                <TableCell>
                  <Customer o={o} />
                </TableCell>
                <TableCell>
                  <Stores o={o} linked />
                </TableCell>
                <TableCell className="text-right">
                  <Total o={o} />
                </TableCell>
                <TableCell>
                  <Status o={o} />
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
        {rows.map((o, i) => (
          <li key={o.orderNumber} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <OrderId o={o} />
              </div>
              <Status o={o} />
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {(
                [
                  ["Customer", <Customer key="c" o={o} />],
                  ["Order date", <Placed key="d" o={o} />],
                  ["Store", <Stores key="s" o={o} />],
                  ["Total", <Total key="t" o={o} />],
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
