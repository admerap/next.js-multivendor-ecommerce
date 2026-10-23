import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminProductRow } from "@/app/admin/(panel)/products/actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { ProductThumb } from "@/components/products/ProductThumb";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS } from "@/lib/validations/product";
import { ProductFlagToggle } from "./ProductFlagToggle";
import { VendorLink } from "@/components/admin/VendorLink";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { StockText } from "@/components/products/StockText";

/** The vendor's own show/hide switch — read-only here (the admin reviews, the vendor decides visibility). */
function ActiveBadge({ on }: { on: boolean }) {
  return (
    <Badge tone={on ? "success" : "neutral"} title={on ? "The vendor shows this product" : "The vendor has hidden this product"}>
      {on ? "Active" : "Inactive"}
    </Badge>
  );
}

function Actions({ p }: { p: AdminProductRow }) {
  return (
    <>
      <Link
        href={`/admin/products/${p.id}`}
        aria-label={`Product details: ${p.name}`}
        title="Product details"
        className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <DeleteProductButton id={p.id} name={p.name} scope="admin" />
    </>
  );
}

/** `tightThumb`: the 9-column table hides the thumbnail from 1201 to 1440px so the name stays readable. */
function NameBlock({ p, children, tightThumb = false }: { p: AdminProductRow; children?: ReactNode; tightThumb?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <span className={cn("shrink-0", tightThumb && "xl:max-2xl:hidden")}>
        <ProductThumb src={p.thumbnail} name={p.name} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/admin/products/${p.id}`} className="flex min-h-11 min-w-0 items-center font-bold !text-fg-strong hover:!text-primary xl:block xl:min-h-0">
          <span className="block truncate" title={p.name}>
            {p.name}
          </span>
        </Link>
        <span className="block truncate text-caption text-fg-muted tabular-nums xl:mt-1" title={`SKU ${p.sku} · ${p.category}`}>
          SKU {p.sku} · {p.category}
        </span>
        {p.approvalStatus === "REJECTED" && p.rejectionReason && (
          <span className="mt-0.5 block truncate text-caption font-semibold text-error-600" title={p.rejectionReason}>
            Reason: {p.rejectionReason}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const submittedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "Oct 15, 2026" + "3 days ago" — how long the request has been waiting (days from the server). */
function Submitted({ p }: { p: AdminProductRow }) {
  const days = p.waitingDays;
  const ago = days === 0 ? "Today" : days < 31 ? relative.format(-days, "day") : relative.format(-Math.round(days / 30), "month");
  return (
    <time dateTime={p.submittedAt} className="block text-[0.82rem] leading-normal">
      <span className="block font-semibold text-fg tabular-nums">{submittedDate.format(new Date(p.submittedAt))}</span>
      <span className="block text-caption text-fg-muted first-letter:uppercase">{ago}</span>
    </time>
  );
}

/** Product cell of the review queue: thumbnail, name (→ details) and SKU. */
function ReviewName({ p, children }: { p: AdminProductRow; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <ProductThumb src={p.thumbnail} name={p.name} />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/products/${p.id}`} className="flex min-h-11 min-w-0 items-center font-bold !text-fg-strong hover:!text-primary xl:block xl:min-h-0">
          <span className="block truncate" title={p.name}>
            {p.name}
          </span>
        </Link>
        <span className="block truncate text-caption text-fg-muted tabular-nums xl:mt-1" title={`SKU ${p.sku}`}>
          SKU {p.sku}
        </span>
      </div>
      {children}
    </div>
  );
}

/** "Details" — the review happens on the product's details page (approve / deny / delete). */
function DetailsButton({ p, className }: { p: AdminProductRow; className?: string }) {
  return (
    <Link
      href={`/admin/products/${p.id}`}
      aria-label={`Details: ${p.name}`}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-card px-3.5 text-caption font-semibold !text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary max-lg:h-11",
        className,
      )}
    >
      <Eye aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      Details
    </Link>
  );
}

/**
 * Pending Products (review queue): Product · Vendor · Category · Price · Submitted · Status ·
 * Details. Full table ≥1201px, labelled cards below.
 */
export function PendingProductTable({ items }: { items: AdminProductRow[] }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3 [&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6">
          <TableHeader>
            <tr>
              <TableHead>Product</TableHead>
              <TableHead className="w-[15%]">Vendor</TableHead>
              <TableHead className="w-[13%]">Category</TableHead>
              <TableHead className="w-[10%]">Price</TableHead>
              <TableHead className="w-[12%]">Submitted</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-30 text-right">Details</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <ReviewName p={p} />
                </TableCell>
                <TableCell>
                  <VendorLink vendor={p.vendor} />
                </TableCell>
                <TableCell>
                  <span className="block truncate text-fg" title={p.category}>
                    {p.category}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="block font-bold text-fg-strong tabular-nums">{money(p.price)}</span>
                  <span className="block text-caption text-fg-muted">{PRODUCT_TYPE_LABELS[p.productType]}</span>
                </TableCell>
                <TableCell>
                  <Submitted p={p} />
                </TableCell>
                <TableCell>
                  <StatusBadges p={p} />
                </TableCell>
                <TableCell className="text-right">
                  <DetailsButton p={p} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Pending products" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((p) => (
          <li key={p.id} className="rounded-lg border border-line p-4">
            <ReviewName p={p} />
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {(
                [
                  ["Vendor", <VendorLink key="v" vendor={p.vendor} />],
                  ["Category", <span key="c" className="text-fg">{p.category}</span>],
                  ["Price", <span key="p" className="font-bold text-fg-strong tabular-nums">{money(p.price)}</span>],
                  ["Submitted", <Submitted key="s" p={p} />],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  <dd className="min-w-0 truncate text-sm">{value}</dd>
                </div>
              ))}
              <div className="col-span-2 min-w-0">
                <dt className={cn("mb-1", cardLabelClass)}>Status</dt>
                <dd>
                  <StatusBadges p={p} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-line pt-3">
              <DetailsButton p={p} className="w-full" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Review status + the vendor's own visibility, stacked in one column. */
function StatusBadges({ p }: { p: AdminProductRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ApprovalBadge status={p.approvalStatus} />
      <ActiveBadge on={p.isActive} />
    </div>
  );
}

function Flag({ p, flag }: { p: AdminProductRow; flag: "isFeatured" | "isPopular" }) {
  return <ProductFlagToggle compact id={p.id} name={p.name} flag={flag} checked={p[flag]} approved={p.approvalStatus === "APPROVED"} />;
}

/**
 * Admin product list (adminvendorproductlist design): SL · Product · Store · Unit price · Stock ·
 * Status (approval + active) · [Featured · Popular] · Action | Details. `withFlags` adds the two
 * placement check boxes (approved / featured / popular lists); `detailsOnly` replaces the icon
 * actions (view + delete) with one labelled "Details" button (approved list — delete lives on the
 * details page). Full table ≥1201px, labelled cards below.
 */
export function AdminProductTable({
  items,
  offset,
  withFlags = false,
  detailsOnly = false,
}: {
  items: AdminProductRow[];
  offset: number;
  withFlags?: boolean;
  detailsOnly?: boolean;
}) {
  return (
    <>
      <div className="hidden xl:block">
        {/* Fixed layout with proportional columns, so every column fits from 1201px. */}
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className={withFlags ? "w-12" : "w-14"}>SL</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className={withFlags ? "w-[13%]" : "w-[14%]"}>Vendor</TableHead>
              <TableHead className="w-[10%]">Unit Price</TableHead>
              <TableHead className={withFlags ? "w-[8%]" : "w-[9%]"}>Stock</TableHead>
              <TableHead className={withFlags ? "w-[11%]" : "w-[14%]"}>Status</TableHead>
              {withFlags && (
                <>
                  {/* Fixed width + tighter padding: the uppercase headers must fit at 1201px. */}
                  <TableHead className="w-20 !px-2 text-center">Featured</TableHead>
                  <TableHead className="w-20 !px-2 text-center">Popular</TableHead>
                </>
              )}
              {detailsOnly ? <TableHead className="w-30 text-right">Details</TableHead> : <TableHead className="w-28 text-center">Action</TableHead>}
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <NameBlock p={p} tightThumb={withFlags} />
                </TableCell>
                <TableCell>
                  <VendorLink vendor={p.vendor} />
                </TableCell>
                <TableCell>
                  <span className="block font-bold text-fg-strong tabular-nums">{money(p.price)}</span>
                  <span className="block text-caption text-fg-muted">{PRODUCT_TYPE_LABELS[p.productType]}</span>
                </TableCell>
                <TableCell>
                  <StockText p={p} />
                </TableCell>
                <TableCell>
                  <StatusBadges p={p} />
                </TableCell>
                {withFlags && (
                  <>
                    <TableCell>
                      <div className="flex justify-center">
                        <Flag p={p} flag="isFeatured" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Flag p={p} flag="isPopular" />
                      </div>
                    </TableCell>
                  </>
                )}
                {detailsOnly ? (
                  <TableCell className="text-right">
                    <DetailsButton p={p} />
                  </TableCell>
                ) : (
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Actions p={p} />
                    </div>
                  </TableCell>
                )}
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
                ["Vendor", <VendorLink key="s" vendor={p.vendor} />],
                ["Type", <span key="t" className="text-fg">{PRODUCT_TYPE_LABELS[p.productType]}</span>],
                ["Unit price", <span key="p" className="font-bold text-fg-strong tabular-nums">{money(p.price)}</span>],
                ["Stock", <StockText key="st" p={p} />],
                ["Approval", <ApprovalBadge key="a" status={p.approvalStatus} />],
                ["Active", <ActiveBadge key="ac" on={p.isActive} />],
                ...(withFlags
                  ? [
                      ["Featured", <Flag key="f" p={p} flag="isFeatured" />],
                      ["Popular", <Flag key="po" p={p} flag="isPopular" />],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  {/* Check boxes sit flush with the label (their 44px hit area extends left). */}
                  <dd className={cn("min-w-0 truncate text-sm", (label === "Featured" || label === "Popular") && "-ml-3")}>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              {detailsOnly ? <DetailsButton p={p} className="w-full" /> : <Actions p={p} />}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
