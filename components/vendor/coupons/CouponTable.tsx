import { SquarePen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CouponRow } from "@/app/vendor/(panel)/coupons/actions";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { couponDate } from "@/lib/coupons";
import { cn } from "@/lib/utils";
import { couponKindLabel } from "@/lib/validations/coupon";
import { CouponActiveSwitch } from "./CouponActiveSwitch";
import { CouponChip, CouponStatusBadge } from "@/components/coupons/CouponBits";
import { CouponViewButton } from "./CouponViewButton";
import { DeleteCouponButton } from "@/components/coupons/DeleteCouponButton";
import { cardLabelClass } from "@/components/data/list-classes";

function Actions({ c }: { c: CouponRow }) {
  return (
    <>
      <CouponViewButton coupon={c} />
      <Link
        href={`/vendor/coupons/${c.id}/edit`}
        aria-label={`Edit coupon ${c.code}`}
        title="Edit coupon"
        className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-iris-50 !text-primary transition-colors duration-(--dur-fast) hover:bg-primary hover:!text-on-primary max-lg:size-11"
      >
        <SquarePen aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <DeleteCouponButton id={c.id} code={c.code} usedCount={c.usedCount} />
    </>
  );
}

function CouponName({ c, children }: { c: CouponRow; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CouponChip coupon={c} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg-strong" title={c.title}>
          {c.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="text-caption font-bold tracking-[0.03em] text-fg tabular-nums">{c.code}</span>
          <CouponStatusBadge status={c.status} />
          {/* Review state only when it blocks the coupon (approved is the normal case). */}
          {c.approvalStatus !== "APPROVED" && <ApprovalBadge status={c.approvalStatus} />}
        </div>
        {c.approvalStatus === "REJECTED" && c.rejectionReason && (
          <p className="mt-1 truncate text-caption font-semibold text-error-600" title={c.rejectionReason}>
            Reason: {c.rejectionReason}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

const Duration = ({ c }: { c: CouponRow }) => (
  <span className="text-[0.82rem] leading-normal text-fg tabular-nums">
    {couponDate(c.startsAt)} –<br />
    {couponDate(c.expiresAt)}
  </span>
);

const Limit = ({ c }: { c: CouponRow }) => (
  <span className="text-[0.82rem] leading-relaxed text-fg-muted">
    Same user: <b className="whitespace-nowrap text-fg-strong">{c.limitPerUser ?? "No limit"}</b>
    <br />
    Total used:{" "}
    <b className="text-fg-strong tabular-nums">
      {c.usedCount}
      {c.usageLimit ? ` / ${c.usageLimit.toLocaleString("en-US")}` : ""}
    </b>
  </span>
);

/**
 * Coupon list (LIST half of vendorcoupon): SL · Coupon · Coupon Type · Duration · Limit · Bearer ·
 * Status · Action. Table from 1201px (proportional columns), labelled cards below.
 */
export function CouponTable({ items, offset }: { items: CouponRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead>Coupon</TableHead>
              <TableHead className="w-[12%]">Coupon Type</TableHead>
              <TableHead className="w-[12%]">Duration</TableHead>
              <TableHead className="w-[14%]">Limit</TableHead>
              <TableHead className="w-[7%]">Bearer</TableHead>
              <TableHead className="w-18">Status</TableHead>
              <TableHead className="w-36 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <CouponName c={c} />
                </TableCell>
                <TableCell className="text-fg">{couponKindLabel(c)}</TableCell>
                <TableCell>
                  <Duration c={c} />
                </TableCell>
                <TableCell>
                  <Limit c={c} />
                </TableCell>
                <TableCell className="text-fg">Seller</TableCell>
                <TableCell>
                  <CouponActiveSwitch id={c.id} code={c.code} isActive={c.isActive} />
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
                  ["Type", <span key="t" className="text-sm text-fg">{couponKindLabel(c)}</span>],
                  ["Bearer", <span key="b" className="text-sm text-fg">Seller</span>],
                  ["Duration", <Duration key="d" c={c} />],
                  ["Limit", <Limit key="l" c={c} />],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-1", cardLabelClass)}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className={cardLabelClass}>Status</dt>
                <dd className="-ml-1.5">
                  <CouponActiveSwitch id={c.id} code={c.code} isActive={c.isActive} />
                </dd>
              </div>
            </dl>
            <div className={cn("mt-3 flex items-center gap-2 border-t border-line pt-3")}>
              <Actions c={c} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
