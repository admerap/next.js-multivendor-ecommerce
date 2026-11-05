import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { NotRecorded } from "@/components/reports/ReportKit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminOrderReportRow } from "@/lib/admin-reports.server";
import { money, moneyOff } from "@/lib/money";
import { adminOrderHref, orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** Figures in the design's column order. Product discounts aren't recorded on orders → "—". */
const figures = (r: AdminOrderReportRow): [string, ReactNode][] => [
  ["Total", <b key="t" className="font-semibold text-fg-strong">{money(r.total)}</b>],
  ["Due", r.due ? <span key="d" className="font-semibold text-warning-600">{money(r.due)}</span> : money(0)],
  ["Return", r.returned ? <span key="r" className="text-error-600">{money(r.returned)}</span> : money(0)],
  ["Product disc.", <NotRecorded key="p" />],
  ["Coupon disc.", moneyOff(r.couponDiscount)],
  ["Shipping", money(r.shipping)],
];

const head = "text-right leading-tight whitespace-normal";

/**
 * Order Report table (adminorderreport design): one row per store in each order — SL · Order ID · Store ·
 * Date · Total · Due · Return · Product disc. · Coupon disc. · Shipping · Status. The order links to Order
 * Manage's details. Table from 1201px, labelled cards below.
 */
export function AdminOrderReportTable({ rows, offset }: { rows: AdminOrderReportRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed text-[0.82rem] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <tr>
              <TableHead className="w-10">SL</TableHead>
              <TableHead className="w-[9%]">Order ID</TableHead>
              <TableHead className="w-[15%]">Store</TableHead>
              <TableHead className="w-[10%]">Date</TableHead>
              {figures(rows[0]!).map(([h]) => (
                <TableHead key={h} className={head}>
                  {h}
                </TableHead>
              ))}
              <TableHead className="w-[12%] text-center">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <Link href={adminOrderHref(r.orderNumber)} className="text-sm font-bold !text-primary tabular-nums hover:underline">
                    #{r.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/vendors/${r.vendorId}`} className="block truncate font-semibold !text-fg-strong hover:!text-primary" title={r.store}>
                    {r.store}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">{orderDate(r.createdAt)}</TableCell>
                {figures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <OrderStatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Orders" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-primary tabular-nums">#{r.orderNumber}</p>
                <p className="truncate text-sm font-semibold text-fg-strong">
                  {r.store} <span className="font-normal text-fg-muted">· {orderDate(r.createdAt)}</span>
                </p>
              </div>
              <OrderStatusBadge status={r.status} />
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {figures(r).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="text-sm text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={adminOrderHref(r.orderNumber)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View order #{r.orderNumber}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
