import { Eye, SquarePen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductRow } from "@/app/vendor/(panel)/products/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS } from "@/lib/validations/product";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { ProductActiveSwitch } from "./ProductActiveSwitch";
import { ProductThumb } from "@/components/products/ProductThumb";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { StockText } from "@/components/products/StockText";

function Actions({ p }: { p: ProductRow }) {
  return (
    <>
      <Link
        href={`/vendor/products/${p.id}`}
        aria-label={`View ${p.name}`}
        title="View"
        className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <Link
        href={`/vendor/products/${p.id}/edit`}
        aria-label={`Edit ${p.name}`}
        title="Edit"
        className={cn(iconActionClass, "border-iris-100 bg-iris-50 !text-primary hover:bg-primary hover:!text-on-primary")}
      >
        <SquarePen aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <DeleteProductButton id={p.id} name={p.name} />
    </>
  );
}

function NameBlock({ p, children }: { p: ProductRow; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <ProductThumb src={p.thumbnail} name={p.name} />
      <div className="min-w-0 flex-1">
        <Link href={`/vendor/products/${p.id}`} className="flex min-h-11 min-w-0 items-center font-bold !text-fg-strong hover:!text-primary xl:block xl:min-h-0">
          <span className="block truncate">{p.name}</span>
        </Link>
        <div className="flex xl:mt-1 flex-wrap items-center gap-2 text-caption text-fg-muted">
          <span className="max-w-full truncate tabular-nums" title={p.sku}>SKU {p.sku}</span>
          <ApprovalBadge status={p.approvalStatus} />
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Vendor product list (vendorproductlist design): SL · Product Name · Category · Type ·
 * Unit Price · Stock · Active Status · Action. Full table ≥1201px, labelled cards below (CLAUDE.md §3.6).
 */
export function ProductTable({ items, offset }: { items: ProductRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        {/* Fixed layout with proportional columns (the design grid), so all 8 columns fit from 1201px. */}
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-14">SL</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="w-[15%]">Category · Type</TableHead>
              <TableHead className="w-[11%]">Unit Price</TableHead>
              <TableHead className="w-[10%]">Stock</TableHead>
              <TableHead className="w-[9%] whitespace-normal">Active Status</TableHead>
              <TableHead className="w-40 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <NameBlock p={p} />
                </TableCell>
                <TableCell>
                  <span className="block truncate text-fg" title={p.category}>
                    {p.category}
                  </span>
                  <span className="block text-caption text-fg-muted">{PRODUCT_TYPE_LABELS[p.productType]}</span>
                </TableCell>
                <TableCell className="font-bold text-fg-strong tabular-nums">{money(p.price)}</TableCell>
                <TableCell>
                  <StockText p={p} />
                </TableCell>
                <TableCell>
                  <ProductActiveSwitch id={p.id} name={p.name} isActive={p.isActive} approvalStatus={p.approvalStatus} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Actions p={p} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Products" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((p, i) => (
          <li key={p.id} className="rounded-lg border border-line p-4">
            <NameBlock p={p}>
              <span className="self-start text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </NameBlock>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {[
                ["Category", <span key="c" className="text-fg">{p.category}</span>],
                ["Type", <span key="t" className="text-fg">{PRODUCT_TYPE_LABELS[p.productType]}</span>],
                ["Unit price", <span key="p" className="font-bold text-fg-strong tabular-nums">{money(p.price)}</span>],
                ["Stock", <StockText key="s" p={p} />],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  <dd className="truncate text-sm">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className={cardLabelClass}>Active</dt>
                <dd className="-ml-1.5">
                  <ProductActiveSwitch id={p.id} name={p.name} isActive={p.isActive} approvalStatus={p.approvalStatus} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <Actions p={p} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
