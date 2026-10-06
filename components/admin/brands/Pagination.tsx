import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Server-side pagination links that keep the current filters (q, status, pageSize). */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  params,
  noun = "brands",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
  noun?: string;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    return `?${q}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Window of up to 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);

  const box = "grid h-10 min-w-10 place-items-center rounded-md px-2.5 text-caption font-bold tabular-nums transition-colors duration-(--dur-fast)";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 text-caption text-fg-muted sm:px-6">
      <span>
        Showing <b className="text-fg-strong tabular-nums">{from}–{to}</b> of <b className="text-fg-strong tabular-nums">{total}</b> {noun}
      </span>
      {/* Always shown (also with a single page), bottom-right; stays right-aligned when it wraps on mobile. */}
      <div className="ml-auto flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} aria-label="Previous page" className={cn(box, "border border-line bg-card !text-fg hover:border-primary")}>
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={cn(box, "border border-line text-fg-subtle")}>
            <ChevronLeft className="size-4" />
          </span>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={href(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(box, p === page ? "bg-primary !text-on-primary shadow-primary" : "bg-card !text-fg shadow-xs hover:!text-primary")}
          >
            {p}
          </Link>
        ))}
        {page < pageCount ? (
          <Link href={href(page + 1)} aria-label="Next page" className={cn(box, "border border-line bg-card !text-fg hover:border-primary")}>
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={cn(box, "border border-line text-fg-subtle")}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
