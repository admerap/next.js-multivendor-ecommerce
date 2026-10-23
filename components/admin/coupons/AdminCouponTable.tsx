import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminCouponRow } from "@/app/admin/(panel)/coupons/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CouponChip, CouponStatusBadge } from "@/components/coupons/CouponBits";
import { DeleteCouponButton } from "@/components/coupons/DeleteCouponButton";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { couponDate } from "@/lib/coupons";
import { cn } from "@/lib/utils";
import { COUPON_SCOPE_LABELS, couponKindLabel } from "@/lib/validations/coupon";
import { VendorLink } from "@/components/admin/VendorLink";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";

function Actions({ c }: { c: AdminCouponRow }) {
  return (
    <>
      <Link
        href={`/admin/coupons/${c.id}`}
        aria-label={`Coupon details: ${c.code}`}
        title="Coupon details"
        className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <DeleteCouponButton id={c.id} code={c.code} usedCount={c.usedCount} scope="admin" />
    </>
  );
}

function CouponName({ c, children }: { c: AdminCouponRow; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CouponChip coupon={c} />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/coupons/${c.id}`} className="flex min-h-11 min-w-0 items-center text-sm font-bold !text-fg-strong hover:!text-primary xl:block xl:min-h-0">
          <span className="block truncate" title={c.title}>
            {c.title}
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 xl:mt-0.5">
          <span className="text-caption font-bold tracking-[0.03em] text-fg tabular-nums">{c.code}</span>
          <CouponStatusBadge status={c.status} />
        </div>
        {c.approvalStatus === "REJECTED" && c.rejectionReason && (
          <p className="mt-0.5 truncate text-caption font-semibold text-error-600" title={c.rejectionReason}>
            Reason: {c.rejectionReason}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

const TypeText = ({ c }: { c: AdminCouponRow }) => (
  <span className="text-[0.82rem] leading-normal">
    <span className="block text-fg">{couponKindLabel(c)}</span>
    <span className="block text-fg-muted">{c.scope === "SPECIFIC_PRODUCTS" ? `${c.productsCount} ${c.productsCount === 1 ? "product" : "products"}` : COUPON_SCOPE_LABELS[c.scope]}</span>
  </span>
);

const Duration = ({ c }: { c: AdminCouponRow }) => (
  <span className="text-[0.82rem] leading-normal text-fg tabular-nums">
    {couponDate(c.startsAt)} –<br />
    {couponDate(c.expiresAt)}
  </span>
);

const Usage = ({ c }: { c: AdminCouponRow }) => (
  <span className="text-[0.82rem] leading-relaxed text-fg-muted">
    Used:{" "}
    <b className="text-fg-strong tabular-nums">
      {c.usedCount}
      {c.usageLimit ? ` / ${c.usageLimit.toLocaleString("en-US")}` : ""}
    </b>
    <br />
    Per user: <b className="whitespace-nowrap text-fg-strong">{c.limitPerUser ?? "No limit"}</b>
  </span>
);

/**
 * Admin coupon list: SL · Coupon · Vendor · Type · Duration · Usage · Approval · Action.
 * Table from 1201px (proportional columns), labelled cards below.
 */
export function AdminCouponTable({ items, offset }: { items: AdminCouponRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead>Coupon</TableHead>
              <TableHead className="w-[14%]">Vendor</TableHead>
              <TableHead className="w-[13%]">Type</TableHead>
              <TableHead className="w-[12%]">Duration</TableHead>
              <TableHead className="w-[12%]">Usage</TableHead>
              <TableHead className="w-[9%]">Approval</TableHead>
              <TableHead className="w-28 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <CouponName c={c} />
                </TableCell>
                <TableCell>
                  <VendorLink vendor={c.vendor} />
                </TableCell>
                <TableCell>
                  <TypeText c={c} />
                </TableCell>
                <TableCell>
                  <Duration c={c} />
                </TableCell>
                <TableCell>
                  <Usage c={c} />
                </TableCell>
                <TableCell>
                  <ApprovalBadge status={c.approvalStatus} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Actions c={c} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Coupons" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {items.map((c, i) => (
          <li key={c.id} className="rounded-lg border border-line p-4">
            <CouponName c={c}>
              <span className="self-start text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </CouponName>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {(
                [
                  ["Vendor", <VendorLink key="s" vendor={c.vendor} />],
                  ["Type", <TypeText key="t" c={c} />],
                  ["Duration", <Duration key="d" c={c} />],
                  ["Usage", <Usage key="u" c={c} />],
                  ["Approval", <ApprovalBadge key="r" status={c.approvalStatus} />],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  <dd className="min-w-0 truncate">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <Actions c={c} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
