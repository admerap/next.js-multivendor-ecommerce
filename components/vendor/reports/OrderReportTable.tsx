import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { NotRecorded } from "@/components/reports/ReportKit";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, moneyOff } from "@/lib/money";
import { orderDate, vendorOrderHref } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { OrderReportRow } from "@/lib/vendor-reports.server";

function OrderId({ r, linked = false }: { r: OrderReportRow; linked?: boolean }) {
  return (
    <>
      {linked ? (
        <Link href={vendorOrderHref(r.id)} className="text-sm font-bold !text-primary tabular-nums hover:underline">
          #{r.orderNumber}
        </Link>
      ) : (
        <p className="text-sm font-bold text-primary tabular-nums">#{r.orderNumber}</p>
      )}
      <p className="text-caption text-fg-muted tabular-nums">{orderDate(r.createdAt)}</p>
    </>
  );
}

/** The figures of one row, in the design's column order (Referral Discount left out: no referral program). */
const figures = (r: OrderReportRow): [string, ReactNode][] => [
  ["Total Amount", <b key="t" className="font-semibold text-fg-strong">{money(r.total)}</b>],
  ["Product Discount", <NotRecorded key="p" />],
  ["Coupon Discount", moneyOff(r.couponDiscount)],
  ["Shipping", money(r.shipping)],
  ["VAT/Tax", money(r.tax)],
  ["Commission", <Commission key="c" r={r} />],
];

/** Charged on delivered parts; "Est." while on its way; "—" (not charged) when canceled / returned / failed. */
function Commission({ r }: { r: OrderReportRow }) {
  if (r.commissionState === "not-charged") return <NotRecorded reason="Not charged — the sale didn't complete" />;
  return (
    <span title={r.commissionState === "estimated" ? "Estimated — charged once the order is delivered" : undefined}>
      {moneyOff(r.commission)}
      {r.commissionState === "estimated" && (
        <>
          {" "}
          <span className="text-caption font-semibold text-fg-subtle">Est.</span>
        </>
      )}
    </span>
  );
}

/**
 * Order Report table (vendororderreport design): SL · Order ID · Total Amount · Product Discount ·
 * Coupon Discount · Shipping · VAT/Tax · Commission · Status. Table from 1201px, labelled cards below.
 */
export function OrderReportTable({ rows, offset }: { rows: OrderReportRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-2.5 [&_th]:px-2.5">
          <TableHeader>
            <tr>
              <TableHead className="w-11">SL</TableHead>
              <TableHead className="w-[12%]">Order ID</TableHead>
              {figures(rows[0]!).map(([h]) => (
                // Two-word headers wrap instead of running into the next column.
                <TableHead key={h} className="text-right leading-tight whitespace-normal">
                  {h}
                </TableHead>
              ))}
              <TableHead className="w-[15%] text-center">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <OrderId r={r} linked />
                </TableCell>
                {figures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right text-sm tabular-nums">
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
                <OrderId r={r} />
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
            <Link href={vendorOrderHref(r.id)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View order
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
