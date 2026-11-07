import { Camera, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cardLabelClass } from "@/components/data/list-classes";
import { ProductThumb } from "@/components/products/ProductThumb";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { VENDOR_REVIEW_STATUS_LABEL, VENDOR_REVIEW_STATUS_TONE } from "@/lib/validations/vendor-review";
import type { VendorReviewRow } from "@/lib/vendor-reviews.server";
import { ReplyDialog } from "./ReplyDialog";

const Product = ({ r }: { r: VendorReviewRow }) => (
  <div className="flex min-w-0 items-center gap-3">
    <ProductThumb src={r.product.thumbnail} name={r.product.name} size={40} />
    <p className="line-clamp-2 min-w-0 text-sm font-semibold text-fg-strong">{r.product.name}</p>
  </div>
);

const Rating = ({ r }: { r: VendorReviewRow }) => (
  <span className="inline-flex items-center gap-1 text-sm font-semibold text-fg-strong tabular-nums" aria-label={`${r.rating} out of 5 stars`}>
    <Star aria-hidden className="size-3.5 fill-rating text-rating" />
    {r.rating}.0
  </span>
);

const Text = ({ r }: { r: VendorReviewRow }) => (
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

const Reply = ({ r }: { r: VendorReviewRow }) =>
  r.reply ? <p className="line-clamp-2 text-sm text-fg">{r.reply}</p> : <span className="text-caption font-semibold text-warning-600">Not replied</span>;

/** Read-only: the Sundry team moderates (approve / deny / hide); the store only sees where a review stands. */
const Status = ({ r }: { r: VendorReviewRow }) => (
  <Badge
    tone={VENDOR_REVIEW_STATUS_TONE[r.status]}
    title={r.status === "pending" ? "Being checked by the Sundry team" : r.status === "hidden" ? "Hidden by the Sundry team" : undefined}
  >
    {VENDOR_REVIEW_STATUS_LABEL[r.status]}
  </Badge>
);

const Action = ({ r }: { r: VendorReviewRow }) => (
  <ReplyDialog
    review={{
      id: r.id,
      ref: r.ref,
      product: r.product.name,
      reviewer: r.reviewer,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      reply: r.reply,
      date: orderDate(r.createdAt),
    }}
  />
);

/**
 * Product Reviews (vendorproductreview design): SL · Review ID · Product · Reviewer · Rating · Review · Reply · Date ·
 * Status · Action. Table from 1201px, labelled cards below.
 */
export function VendorReviewTable({ rows, offset }: { rows: VendorReviewRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-11">SL</TableHead>
              <TableHead className="w-[8.5%]">Review ID</TableHead>
              <TableHead className="w-[14%]">Product</TableHead>
              <TableHead className="w-[8%]">Reviewer</TableHead>
              <TableHead className="w-[6.5%]">Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="w-[15%]">Reply</TableHead>
              <TableHead className="w-[8.5%]">Date</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-16 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell className="text-caption font-semibold whitespace-nowrap text-fg-muted tabular-nums">#{r.ref}</TableCell>
                <TableCell>
                  <Product r={r} />
                </TableCell>
                <TableCell className="truncate text-sm font-semibold text-fg-strong">{r.reviewer}</TableCell>
                <TableCell>
                  <Rating r={r} />
                </TableCell>
                <TableCell>
                  <Text r={r} />
                </TableCell>
                <TableCell>
                  <Reply r={r} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-fg tabular-nums">{orderDate(r.createdAt)}</TableCell>
                <TableCell>
                  <Status r={r} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Action r={r} />
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
              <Text r={r} />
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {(
                [
                  [
                    "Reviewer",
                    <span key="n" className="text-sm font-semibold text-fg-strong">
                      {r.reviewer}
                    </span>,
                  ],
                  ["Rating", <Rating key="r" r={r} />],
                  [
                    "Date",
                    <span key="d" className="text-sm tabular-nums">
                      {orderDate(r.createdAt)}
                    </span>,
                  ],
                  [
                    "Review ID",
                    <span key="i" className="text-sm font-semibold tabular-nums">
                      #{r.ref}
                    </span>,
                  ],
                ] as [string, ReactNode][]
              ).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 flex items-start justify-between gap-3 border-t border-line pt-3.5">
              <div className="min-w-0">
                <p className={cn("mb-0.5", cardLabelClass)}>Your reply</p>
                <Reply r={r} />
              </div>
              <Action r={r} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
