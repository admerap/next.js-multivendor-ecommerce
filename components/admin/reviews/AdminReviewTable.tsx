import { Camera, Eye, EyeOff, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminReviewRow } from "@/lib/admin-reviews.server";
import { orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { ADMIN_REVIEW_STATUS_LABEL, ADMIN_REVIEW_STATUS_TONE, reviewRef } from "@/lib/validations/admin-review";

export const adminReviewHref = (id: string) => `/admin/reviews/${id}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function Product({ r, linked = false }: { r: AdminReviewRow; linked?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={r.product.thumbnail} name={r.product.name} size={40} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{r.product.name}</p>
        <p className="truncate text-caption text-fg-muted">
          Sold by{" "}
          {linked ? (
            <Link href={`/admin/vendors/${r.store.id}`} className="font-semibold !text-primary hover:underline">
              {r.store.name}
            </Link>
          ) : (
            <span className="font-semibold text-fg">{r.store.name}</span>
          )}
        </p>
      </div>
    </div>
  );
}

const Customer = ({ r }: { r: AdminReviewRow }) => (
  <div className="flex min-w-0 items-center gap-2">
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-iris-50 text-[0.68rem] font-bold text-primary">
      {initials(r.customer.name)}
    </span>
    <span className="truncate text-sm font-semibold text-fg-strong">{r.customer.name}</span>
  </div>
);

const Rating = ({ r }: { r: AdminReviewRow }) => (
  <span className="inline-flex items-center gap-1 text-sm font-semibold text-fg-strong tabular-nums" aria-label={`${r.rating} out of 5 stars`}>
    <Star aria-hidden className="size-3.5 fill-rating text-rating" />
    {r.rating}.0
  </span>
);

const Excerpt = ({ r }: { r: AdminReviewRow }) => (
  <div className="min-w-0">
    {r.title && <p className="truncate text-sm font-semibold text-fg-strong">{r.title}</p>}
    <p className="line-clamp-2 text-sm text-fg">{r.comment}</p>
    {r.photoCount > 0 && (
      <p className="mt-0.5 inline-flex items-center gap-1 text-caption text-fg-muted">
        <Camera aria-hidden className="size-3.5" strokeWidth={2} />
        {r.photoCount} {r.photoCount === 1 ? "photo" : "photos"}
      </p>
    )}
  </div>
);

/** Moderation status; an approved review switched off shows "Hidden" too (it's not on the storefront). */
const Status = ({ r }: { r: AdminReviewRow }) => (
  <div className="flex flex-col items-start gap-1">
    <Badge tone={ADMIN_REVIEW_STATUS_TONE[r.status]}>{ADMIN_REVIEW_STATUS_LABEL[r.status]}</Badge>
    {r.status === "APPROVED" && !r.isVisible && (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-fg-muted">
        <EyeOff aria-hidden className="size-3.5" strokeWidth={2} />
        Hidden
      </span>
    )}
  </div>
);

const View = ({ r }: { r: AdminReviewRow }) => (
  <Link
    href={adminReviewHref(r.id)}
    aria-label={`View review #${reviewRef(r.id)}`}
    title="View review"
    className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
  >
    <Eye aria-hidden className="size-4" strokeWidth={2} />
  </Link>
);

/**
 * Customer Review list (admincustomerreview design): ID · Product · Customer · Rating · Review · Date ·
 * Status · Action. Table from 1201px, labelled cards below.
 */
export function AdminReviewTable({ rows }: { rows: AdminReviewRow[] }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-[10%]">ID</TableHead>
              <TableHead className="w-[20%]">Product</TableHead>
              <TableHead className="w-[13%]">Customer</TableHead>
              <TableHead className="w-[7%]">Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="w-[11%]">Date</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-18 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-caption font-semibold whitespace-nowrap text-fg-muted tabular-nums">#{reviewRef(r.id)}</TableCell>
                <TableCell>
                  <Product r={r} linked />
                </TableCell>
                <TableCell>
                  <Customer r={r} />
                </TableCell>
                <TableCell>
                  <Rating r={r} />
                </TableCell>
                <TableCell>
                  <Excerpt r={r} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-fg tabular-nums">{orderDate(r.createdAt)}</TableCell>
                <TableCell>
                  <Status r={r} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <View r={r} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Reviews" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Product r={r} />
              </div>
              <Status r={r} />
            </div>
            <div className="mt-3">
              <Excerpt r={r} />
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {(
                [
                  ["Customer", <Customer key="c" r={r} />],
                  ["Rating", <Rating key="r" r={r} />],
                  ["Date", <span key="d" className="text-sm tabular-nums">{orderDate(r.createdAt)}</span>],
                  ["ID", <span key="i" className="text-sm font-semibold tabular-nums">#{reviewRef(r.id)}</span>],
                ] as [string, ReactNode][]
              ).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 flex justify-end border-t border-line pt-3.5">
              <View r={r} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
