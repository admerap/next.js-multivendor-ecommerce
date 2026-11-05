import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Dashboard "top N" lists (admindashboard / vendordashboard designs): sunken rows that lift on hover,
 * media on the left, a title + muted line, and a figure on the right. Scrolls past ~5 rows.
 */
export function RankList({ children }: { children: ReactNode }) {
  return <ul className="flex max-h-90 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">{children}</ul>;
}

export function RankRow({ href, media, title, meta, aside }: { href: string; media: ReactNode; title: string; meta?: ReactNode; aside: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center gap-3 rounded-md bg-sunken p-3 !text-fg transition-[background-color,box-shadow] duration-(--dur-med) hover:bg-card hover:shadow-md"
      >
        {media}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-fg-strong">{title}</span>
          {meta && <span className="mt-0.5 block truncate text-caption text-fg-muted">{meta}</span>}
        </span>
        <span className="shrink-0 text-right">{aside}</span>
      </Link>
    </li>
  );
}

/** Pill figure on the right of a row, e.g. "Orders: 3". */
export function RankPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-iris-50 px-2.5 py-1 text-caption font-bold whitespace-nowrap text-primary tabular-nums">{children}</span>;
}

/** "★ 4.5 (12)" — ratingAvg is stored in hundredths. */
export function RankRating({ ratingAvg, reviews }: { ratingAvg: number; reviews: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-fg-strong tabular-nums">
      <Star aria-hidden className="size-3.5 fill-rating text-rating" />
      {(ratingAvg / 100).toFixed(1)}
      <span className="font-normal text-fg-muted">
        ({reviews}
        <span className="sr-only"> {reviews === 1 ? "review" : "reviews"}</span>)
      </span>
    </span>
  );
}

/** Revenue over units sold, right-aligned. */
export function RankSold({ revenue, sold }: { revenue: string; sold: number }) {
  return (
    <>
      <span className="block text-sm font-bold text-fg-strong tabular-nums">{revenue}</span>
      <span className="block text-caption text-fg-muted tabular-nums">{sold} sold</span>
    </>
  );
}
