import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminProductReportRow } from "@/lib/admin-reports.server";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { STOCK_LEVEL_LABEL, STOCK_LEVEL_TONE } from "@/lib/validations/admin-report";

const productHref = (id: string) => `/admin/products/${id}`;

/** Product name + "Sold by <store>", linked to the admin product details. */
function ProductCell({ r }: { r: AdminProductReportRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={r.image} name={r.name} size={44} />
      <div className="min-w-0">
        <Link href={productHref(r.id)} className="line-clamp-2 font-semibold !text-fg-strong hover:!text-primary" title={r.name}>
          {r.name}
        </Link>
        <p className="truncate text-caption text-fg-muted">
          Sold by{" "}
          <Link href={`/admin/vendors/${r.vendorId}`} className="font-semibold !text-fg-muted hover:!text-primary">
            {r.store}
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Current stock, coloured by level (0 = out, under 10 = soon out); digital products have none. */
function Stock({ r }: { r: AdminProductReportRow }) {
  if (r.stock === null) return <span className="text-fg-subtle">Digital</span>;
  return <span className={cn("font-semibold", r.level === "out" ? "text-error-600" : r.level === "low" ? "text-warning-600" : "text-fg-strong")}>{r.stock.toLocaleString("en-US")}</span>;
}

const availability = (r: AdminProductReportRow) =>
  r.level === null ? <Badge tone="neutral">Digital</Badge> : <Badge tone={STOCK_LEVEL_TONE[r.level]}>{STOCK_LEVEL_LABEL[r.level]}</Badge>;

const figures = (r: AdminProductReportRow): [string, ReactNode][] => [
  ["Unit price", money(r.unitPrice)],
  ["Amount sold", <b key="a" className="font-semibold text-fg-strong">{money(r.revenue)}</b>],
  ["Qty sold", r.soldQty.toLocaleString("en-US")],
  ["Avg. value", r.avgValue === null ? <span key="v" className="text-fg-subtle">—</span> : money(r.avgValue)],
  ["In stock", <Stock key="s" r={r} />],
];

const head = "text-right leading-tight whitespace-normal";

/**
 * Product Report › All Products (adminproductreport design): SL · Product (sold by) · Unit price · Amount sold ·
 * Qty sold · Avg. value · In stock · Status. Amount sold = items after coupons, before tax, in the range.
 */
export function AdminProductTable({ rows, offset }: { rows: AdminProductReportRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed text-[0.82rem] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <tr>
              <TableHead className="w-10">SL</TableHead>
              <TableHead className="w-[32%]">Product</TableHead>
              {figures(rows[0]!).map(([h]) => (
                <TableHead key={h} className={head}>
                  {h}
                </TableHead>
              ))}
              <TableHead className="w-[11%] text-center">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <ProductCell r={r} />
                </TableCell>
                {figures(r).map(([h, v]) => (
                  <TableCell key={h} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <ApprovalBadge status={r.approvalStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Products" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <ProductCell r={r} />
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <div className="mt-3">
              <ApprovalBadge status={r.approvalStatus} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
              {figures(r).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="text-sm text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={productHref(r.id)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
              <Eye aria-hidden className="size-4" strokeWidth={2} />
              View product
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Product Report › Wish Listed Products: SL · Product (sold by) · Price · Wishlisted by · Availability. */
export function WishlistTable({ rows, offset }: { rows: AdminProductReportRow[]; offset: number }) {
  const saves = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "customer" : "customers"}`;
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead className="w-[45%]">Product</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Wishlisted by</TableHead>
              <TableHead className="text-center">Availability</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <ProductCell r={r} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(r.unitPrice)}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{saves(r.wishlisted)}</TableCell>
                <TableCell className="text-center">{availability(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul role="list" aria-label="Wish listed products" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <ProductCell r={r} />
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm tabular-nums">
                {money(r.unitPrice)} · <b className="text-fg-strong">{saves(r.wishlisted)}</b>
              </span>
              {availability(r)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
