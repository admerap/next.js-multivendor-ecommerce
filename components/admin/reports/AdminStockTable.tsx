import { Eye, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { cardLabelClass } from "@/components/data/list-classes";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminStockRow } from "@/lib/admin-reports.server";
import { cn } from "@/lib/utils";
import { STOCK_LEVEL_LABEL, STOCK_LEVEL_TONE } from "@/lib/validations/admin-report";

const productHref = (id: string) => `/admin/products/${id}`;
/** "Sep 22, 2026, 09:13 AM" — the design's last-updated format. */
const updated = (d: Date) =>
  `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

function ProductCell({ r }: { r: AdminStockRow }) {
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

const Stock = ({ r }: { r: AdminStockRow }) => (
  <span className={cn("font-display text-base font-extrabold tabular-nums", r.level === "out" ? "text-error-600" : r.level === "low" ? "text-warning-600" : "text-fg-strong")}>
    {r.stock.toLocaleString("en-US")}
    {r.hasVariations && (
      <>
        {" "}
        <span className="font-sans text-caption font-normal text-fg-muted">all variations</span>
      </>
    )}
  </span>
);

/** Which variations are sold out / running low — the total can hide a size that's gone. */
function VariationAlerts({ r, className }: { r: AdminStockRow; className?: string }) {
  if (!r.variationsOut.length && !r.variationsLow.length) return null;
  const list = (names: string[]) => (names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2} more` : names.join(", "));
  return (
    <div className={cn("flex flex-col gap-0.5 text-caption", className)}>
      {r.variationsOut.length > 0 && (
        <span className="flex items-start gap-1 text-error-600" title={r.variationsOut.join(", ")}>
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {r.variationsOut.length} out: {list(r.variationsOut)}
        </span>
      )}
      {r.variationsLow.length > 0 && (
        <span className="flex items-start gap-1 text-warning-600" title={r.variationsLow.join(", ")}>
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {r.variationsLow.length} low: {list(r.variationsLow)}
        </span>
      )}
    </div>
  );
}

const Status = ({ r }: { r: AdminStockRow }) => <Badge tone={STOCK_LEVEL_TONE[r.level]}>{STOCK_LEVEL_LABEL[r.level]}</Badge>;
const UPDATED_HINT = "Last change to the product or its variations — stock or details (stock changes aren't logged on their own)";

/**
 * Product Stock Report table (adminproductstock design): SL · Product (sold by) · Category · Last updated
 * stock · Current stock · Status. A product with variations shows the sum of their stock. Cards ≤1200px.
 */
export function AdminStockTable({ rows, offset }: { rows: AdminStockRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead className="w-[38%]">Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="leading-tight whitespace-normal" title={UPDATED_HINT}>
                Last updated
              </TableHead>
              <TableHead className="text-right">Current stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <ProductCell r={r} />
                </TableCell>
                <TableCell className="truncate" title={r.category}>
                  {r.category}
                </TableCell>
                <TableCell className="text-sm tabular-nums">{updated(r.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Stock r={r} />
                  <VariationAlerts r={r} className="mt-1 items-end" />
                </TableCell>
                <TableCell className="text-center">
                  <Status r={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Product stock" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <ProductCell r={r} />
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Current stock</dt>
                <dd>
                  <Stock r={r} />
                  <VariationAlerts r={r} className="mt-1" />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Status</dt>
                <dd>
                  <Status r={r} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Category</dt>
                <dd className="truncate text-sm text-fg">{r.category}</dd>
              </div>
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Last updated</dt>
                <dd className="text-sm text-fg tabular-nums">{updated(r.updatedAt)}</dd>
              </div>
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
