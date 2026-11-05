import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { NotRecorded } from "@/components/reports/ReportKit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, moneyOff } from "@/lib/money";
import { PAYMENT_REPORT_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, orderDate, vendorOrderHref } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { EXPENSE_LABEL } from "@/lib/validations/vendor-report";
import type { ExpenseRow, ExpenseType, OrderTransactionRow } from "@/lib/vendor-reports.server";

function OrderId({ id, orderNumber, date, linked }: { id: string; orderNumber: number; date?: Date; linked: boolean }) {
  return (
    <>
      {linked ? (
        <Link href={vendorOrderHref(id)} className="text-sm font-bold !text-primary tabular-nums hover:underline">
          #{orderNumber}
        </Link>
      ) : (
        <p className="text-sm font-bold text-primary tabular-nums">#{orderNumber}</p>
      )}
      {date && <p className="text-caption text-fg-muted tabular-nums">{orderDate(date)}</p>}
    </>
  );
}

const Payment = ({ r }: { r: OrderTransactionRow }) => (
  <Badge tone={PAYMENT_STATUS_TONE[r.payment]} title={PAYMENT_STATUS_LABEL[r.payment]}>
    {PAYMENT_REPORT_LABEL[r.payment]}
  </Badge>
);

/** Order Transactions figures, design column order (Referral Discount left out: no referral program). */
const figures = (r: OrderTransactionRow): [string, ReactNode][] => [
  ["Product Amount", money(r.amount)],
  ["Product Discount", <NotRecorded key="p" />],
  ["Coupon Discount", moneyOff(r.couponDiscount)],
  ["Discounted Amount", money(r.discountedAmount)],
  ["VAT/Tax", money(r.tax)],
  ["Shipping", money(r.shipping)],
  ["Order Amount", <b key="o" className="font-semibold text-fg-strong">{money(r.orderAmount)}</b>],
];

const head = "text-right leading-tight whitespace-normal";

/**
 * Transactions Report › Order Transactions (vendortransactionreport design): SL · Order ID · Customer ·
 * Product Amount · Product Discount · Coupon Discount · Discounted Amount · VAT/Tax · Shipping · Order
 * Amount · Payment. Table from 1201px, labelled cards below.
 */
export function OrderTransactionTable({ rows, offset }: { rows: OrderTransactionRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed text-[0.82rem] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <tr>
              <TableHead className="w-10">SL</TableHead>
              <TableHead className="w-[10%]">Order ID</TableHead>
              <TableHead className="w-[11%] leading-tight whitespace-normal">Customer</TableHead>
              {figures(rows[0]!).map(([h]) => (
                <TableHead key={h} className={head}>
                  {h}
                </TableHead>
              ))}
              <TableHead className="w-[11.5%] text-center">Payment</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <OrderId id={r.id} orderNumber={r.orderNumber} date={r.createdAt} linked />
                </TableCell>
                <TableCell>
                  <p className="truncate font-semibold text-fg-strong" title={r.customer}>
                    {r.customer}
                  </p>
                  <p className="text-caption text-fg-muted tabular-nums">
                    {r.units} {r.units === 1 ? "item" : "items"}
                  </p>
                </TableCell>
                {figures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <Payment r={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Order transactions" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <OrderId id={r.id} orderNumber={r.orderNumber} date={r.createdAt} linked={false} />
                <p className="mt-1 truncate text-sm font-semibold text-fg-strong">
                  {r.customer} <span className="font-normal text-fg-muted">· {r.units} {r.units === 1 ? "item" : "items"}</span>
                </p>
              </div>
              <Payment r={r} />
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
            <Link href={vendorOrderHref(r.id)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View order #{r.orderNumber}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Transactions Report › Expense Transactions: SL · XID · Date · Order ID · Expense Type · Expense Amount. */
export function ExpenseTable({ rows, offset }: { rows: ExpenseRow[]; offset: number }) {
  const typeBadge = (t: ExpenseType) => <Badge tone={t === "COMMISSION" ? "primary" : "warning"}>{EXPENSE_LABEL[t]}</Badge>;
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead>XID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead className="text-center">Expense Type</TableHead>
              <TableHead className="text-right">Expense Amount</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((e, i) => (
              <TableRow key={e.xid}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell className="font-semibold text-fg-strong tabular-nums">{e.xid}</TableCell>
                <TableCell className="tabular-nums">{orderDate(e.createdAt)}</TableCell>
                <TableCell>
                  <OrderId id={e.storeOrderId} orderNumber={e.orderNumber} linked />
                </TableCell>
                <TableCell className="text-center">{typeBadge(e.type)}</TableCell>
                <TableCell className="text-right font-semibold text-error-600 tabular-nums">−{money(e.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul role="list" aria-label="Expense transactions" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((e, i) => (
          <li key={e.xid} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-fg-strong tabular-nums">{e.xid}</p>
                <p className="text-caption text-fg-muted tabular-nums">
                  {orderDate(e.createdAt)} · Order #{e.orderNumber}
                </p>
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {typeBadge(e.type)}
              <span className="font-semibold text-error-600 tabular-nums">−{money(e.amount)}</span>
            </div>
            <Link href={vendorOrderHref(e.storeOrderId)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View order #{e.orderNumber}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
