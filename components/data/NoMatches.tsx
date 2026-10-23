import { SearchX } from "lucide-react";

/** Shown when filters/search return nothing (the list itself isn't empty). */
export function NoMatches({ noun, q }: { noun: string; q: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <SearchX aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
      <p className="text-sm text-fg-muted">
        No {noun} match{q ? <> “<b className="text-fg-strong">{q}</b>”</> : " these filters"}. Try another name or filter.
      </p>
    </div>
  );
}
