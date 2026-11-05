import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { ProductThumb } from "@/components/products/ProductThumb";
import { NotRecorded } from "@/components/reports/ReportKit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EarningBucketRow, VendorEarningRow } from "@/lib/admin-reports.server";
import { money, moneyOff } from "@/lib/money";
import { cn } from "@/lib/utils";

const NO_INHOUSE = "No in-house Sundry Official store yet";
const NO_INCENTIVE = "No delivery-man incentives yet";
const NO_REFUNDS = "Refunds aren't built yet";

/** Admin Earning figures per period, design column order. Not-yet-built sources read "—", never a made-up 0. */
const bucketFigures = (r: EarningBucketRow): [string, ReactNode][] => [
  ["In-house", <NotRecorded key="i" reason={NO_INHOUSE} />],
  ["Commission", money(r.commission)],
  ["Shipping", money(r.shipping)],
  ["Deliveryman incentive", <NotRecorded key="d" reason={NO_INCENTIVE} />],
  ["Discount given", r.discount ? moneyOff(r.discount) : money(0)],
  ["VAT / Tax", <span key="t" title="Collected and passed on — not part of Sundry's earning">{money(r.tax)}</span>],
  ["Refunds", <NotRecorded key="r" reason={NO_REFUNDS} />],
  ["Total", <b key="o" className="font-semibold text-fg-strong">{money(r.total)}</b>],
];

const head = "text-right leading-tight whitespace-normal";

/**
 * Earning Reports › Admin Earning › Total earnings (adminearningreports design): one row per period of the
 * range — SL · Duration · In-house · Commission · Shipping · Deliveryman incentive · Discount given ·
 * VAT / Tax · Refunds · Total, with the range's total underneath. Table from 1201px, cards below.
 */
export function EarningBucketTable({ rows, total }: { rows: EarningBucketRow[]; total: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed text-[0.82rem] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <tr>
              <TableHead className="w-10">SL</TableHead>
              <TableHead className="w-[11%]">Duration</TableHead>
              {bucketFigures(rows[0]!).map(([h]) => (
                <TableHead key={h} className={head}>
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.label}>
                <TableCell className="text-fg-muted tabular-nums">{i + 1}</TableCell>
                <TableCell className="font-semibold text-fg-strong">{r.label}</TableCell>
                {bucketFigures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <tfoot className="border-t border-line bg-sunken">
            <TableRow>
              <TableCell colSpan={9} className="text-right font-semibold text-fg-strong">
                Total admin earning
              </TableCell>
              <TableCell className="text-right font-display text-base font-extrabold text-fg-strong tabular-nums">{money(total)}</TableCell>
            </TableRow>
          </tfoot>
        </Table>
      </div>

      <ul role="list" aria-label="Admin earnings by period" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.label} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-fg-strong">{r.label}</p>
              <span className="text-caption text-fg-subtle tabular-nums">#{i + 1}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {bucketFigures(r).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="text-sm text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 rounded-lg bg-sunken p-4">
          <span className="font-semibold text-fg-strong">Total admin earning</span>
          <span className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money(total)}</span>
        </li>
      </ul>
    </>
  );
}

const vendorFigures = (r: VendorEarningRow): [string, ReactNode][] => [
  ["Orders", r.orders.toLocaleString("en-US")],
  ["Gross sales", money(r.gross)],
  ["Commission paid", moneyOff(r.commission)],
  ["Shipping", money(r.shipping)],
  ["Net earning", <b key="n" className="font-semibold text-fg-strong">{money(r.net)}</b>],
  ["Withdrawn", <NotRecorded key="w" reason="Payouts arrive with Stripe Connect" />],
  ["Balance", <span key="b" className="font-semibold text-success-600">{money(r.balance)}</span>],
];

const storeHref = (id: string) => `/admin/vendors/${id}`;

/**
 * Earning Reports › Vendor Earning › Vendor earnings: SL · Store · Orders · Gross sales · Commission paid ·
 * Shipping · Net earning · Withdrawn · Balance. Orders = delivered store orders in the range.
 */
export function VendorEarningTable({ rows, offset }: { rows: VendorEarningRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed text-[0.82rem] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <tr>
              <TableHead className="w-10">SL</TableHead>
              <TableHead className="w-[22%]">Store</TableHead>
              {vendorFigures(rows[0]!).map(([h]) => (
                <TableHead key={h} className={head}>
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.vendorId}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <Link href={storeHref(r.vendorId)} className="flex min-w-0 items-center gap-2.5 font-semibold !text-fg-strong hover:!text-primary">
                    <ProductThumb src={r.logo} name={r.store} size={36} />
                    <span className="truncate">{r.store}</span>
                  </Link>
                </TableCell>
                {vendorFigures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Vendor earnings" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.vendorId} className="rounded-lg border border-line p-4">
            <div className="flex items-center gap-3">
              <ProductThumb src={r.logo} name={r.store} size={40} />
              <p className="min-w-0 flex-1 truncate font-semibold text-fg-strong">{r.store}</p>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {vendorFigures(r).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="text-sm text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={storeHref(r.vendorId)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View {r.store}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
