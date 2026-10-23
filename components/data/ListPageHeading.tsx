import type { LucideIcon } from "lucide-react";

/** Page title with icon tile and total pill — same as the Brands page heading. */
export function ListPageHeading({ icon: Icon, title, total, noun }: { icon: LucideIcon; title: string; total: number; noun: string }) {
  return (
    <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
        <Icon aria-hidden className="size-5" strokeWidth={1.9} />
      </span>
      {title}
      <span className="rounded-full bg-card px-2.5 py-0.5 font-sans text-sm font-bold text-fg-muted tabular-nums shadow-xs" aria-label={`${total} ${noun}`}>
        {total}
      </span>
    </h1>
  );
}
