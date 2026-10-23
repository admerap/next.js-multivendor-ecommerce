import { Star } from "lucide-react";
import Image from "next/image";
import { StarRating } from "@/components/commerce/StarRating";
import type { ReviewSummary } from "@/lib/storefront";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "1 week ago" (server-rendered once, so there's no client/server mismatch). */
function ago(iso: string) {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secs] of UNITS) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}

/**
 * Reviews tab (Product Detail Page design + PRD FR-S19): average score, stars, per-star distribution and
 * the reviews (avatar, name, date, rating, text, photos). Renders from ReviewSummary, so it shows real
 * reviews as soon as getProductReviews returns them (TODO(reviews) there). Empty → "No reviews yet".
 */
export function ProductReviews({ summary }: { summary: ReviewSummary }) {
  if (summary.count === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-iris-50">
          <Star aria-hidden className="size-7 text-primary" strokeWidth={1.6} />
        </span>
        <h3 className="font-display text-h4 font-bold text-fg-strong">No reviews yet</h3>
        <p className="max-w-[380px] text-sm text-fg-muted">Reviews from verified buyers will appear here once this product has been delivered.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-10">
      <div className="flex-[0_0_200px] max-sm:flex-auto">
        <p className="font-display text-[3.06rem] leading-none font-extrabold text-fg-strong tabular-nums">{summary.average.toFixed(1)}</p>
        <StarRating value={summary.average} size="lg" className="mt-2.5 mb-1.5" />
        <p className="text-[0.81rem] text-fg-muted">
          Based on {summary.count} {summary.count === 1 ? "review" : "reviews"}
        </p>
        <ul aria-label="Rating distribution" className="mt-4 flex flex-col gap-1.5">
          {summary.distribution.map((d) => {
            const pct = summary.count ? Math.round((d.count * 100) / summary.count) : 0;
            return (
              <li key={d.stars} className="flex items-center gap-2 text-caption text-fg-muted tabular-nums">
                <span className="w-3 text-right font-semibold text-fg">{d.stars}</span>
                <Star aria-hidden className="size-3 fill-current text-rating" strokeWidth={1.5} />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${d.stars} ${d.stars === 1 ? "star" : "stars"}: ${d.count} (${pct}%)`}>
                  {/* Runtime value: bar width = share of reviews. */}
                  <span className="block h-full rounded-full bg-rating" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-6 text-right">{d.count}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="min-w-0 flex-[1_1_340px]">
        {summary.reviews.map((r) => (
          <li key={r.id} className="flex gap-4 border-b border-line py-4.5 last:border-b-0">
            <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-iris-50 text-[0.88rem] font-bold text-primary">
              {r.avatar ? <Image src={r.avatar} alt="" fill sizes="44px" className="object-cover" /> : initials(r.author)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-bold text-fg-strong">{r.author}</span>
                <time dateTime={r.createdAt} className="ml-auto text-caption text-fg-subtle">
                  {ago(r.createdAt)}
                </time>
              </div>
              <StarRating value={r.rating} className="my-1.5" />
              <p className="text-sm leading-relaxed text-pretty text-fg">{r.body}</p>
              {r.photos.length > 0 && (
                <ul aria-label="Review photos" className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((src) => (
                    <li key={src} className="relative size-16 overflow-hidden rounded-md bg-sunken">
                      <Image src={src} alt={`Photo from ${r.author}`} fill sizes="64px" className="object-cover" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
