import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderDate } from "@/lib/orders";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { STOCK_LABEL } from "@/lib/validations/vendor-report";
import type { ProductReportRow } from "@/lib/vendor-reports.server";


const STOCK_TONE = { in: "success", low: "warning", out: "error", digital: "neutral" } as const;

function ProductName({ r, linked = false }: { r: ProductReportRow; linked?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={r.image} name={r.name} size={44} />
      <div className="min-w-0">
        {linked ? (
          <Link href={`/vendor/products/${r.id}`} className="line-clamp-2 text-sm font-semibold !text-fg-strong hover:!text-primary" title={r.name}>
            {r.name}
          </Link>
        ) : (
          <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{r.name}</p>
        )}
        <p className="truncate text-caption text-fg-muted">SKU {r.sku}</p>
      </div>
    </div>
  );
}

const Stock = ({ r }: { r: ProductReportRow }) =>
  r.stockStatus === "digital" ? <span className="text-fg-subtle">Digital</span> : <span className={cn(r.stockStatus === "out" ? "text-error-600" : r.stockStatus === "low" ? "text-warning-600" : "text-fg")}>{r.stock.toLocaleString("en-US")}</span>;

const Rating = ({ r }: { r: ProductReportRow }) =>
  r.rating === null ? (
    <span className="text-fg-subtle" title="No approved reviews yet">
      —<span className="sr-only"> (no reviews yet)</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <Star aria-hidden className="size-3.5 fill-rating text-rating" />
      {r.rating.toFixed(1)}
      <span className="text-caption text-fg-muted">({r.reviewCount})</span>
    </span>
  );

/** "All Products" figures, in the design's column order. */
const figures = (r: ProductReportRow): [string, ReactNode][] => [
  ["Unit Price", money(r.unitPrice)],
  ["Total Amount Sold", <b key="t" className="font-semibold text-fg-strong">{money(r.revenue)}</b>],
  ["Qty Sold", r.soldQty.toLocaleString("en-US")],
  ["Avg Product Value", r.soldQty ? money(r.avgValue) : <span key="a" className="text-fg-subtle">—</span>],
  ["Current Stock", <Stock key="s" r={r} />],
  ["Avg Rating", <Rating key="r" r={r} />],
];

const stockFigures = (r: ProductReportRow): [string, ReactNode][] => [
  ["Last Updated", orderDate(r.updatedAt)],
  ["Current Stock", <Stock key="s" r={r} />],
  ["Stock Status", <Badge key="b" tone={STOCK_TONE[r.stockStatus]}>{STOCK_LABEL[r.stockStatus]}</Badge>],
];

/**
 * Product Report tables (vendorproductreport design). "all": SL · Product · Unit Price · Total Amount
 * Sold · Qty Sold · Avg Product Value · Current Stock · Avg Rating. "stock": SL · Product · Last Updated
 * · Current Stock · Stock Status. Table from 1201px, labelled cards below.
 */
export function ProductReportTable({ rows, offset, tab }: { rows: ProductReportRow[]; offset: number; tab: "all" | "stock" }) {
  const cols = tab === "all" ? figures : stockFigures;
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-2.5 [&_th]:px-2.5">
          <TableHeader>
            <tr>
              <TableHead className="w-11">SL</TableHead>
              <TableHead className={tab === "all" ? "w-[28%]" : "w-[40%]"}>Product Name</TableHead>
              {cols(rows[0]!).map(([h]) => (
                <TableHead key={h} className={cn("leading-tight whitespace-normal", h === "Stock Status" ? "text-center" : "text-right")}>
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <ProductName r={r} linked />
                </TableCell>
                {cols(r).map(([h, v]) => (
                  <TableCell key={h} className={cn("text-sm tabular-nums", h === "Stock Status" ? "text-center" : "text-right")}>
                    {v}
                  </TableCell>
                ))}
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
                <ProductName r={r} />
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {cols(r).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd className="text-sm text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
