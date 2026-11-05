import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Side-column card of the order details pages (vendor + admin): icon title, optional right-hand slot. */
export function SideCard({ icon: Icon, title, aside, children }: { icon: LucideIcon; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 font-display text-base font-bold text-fg-strong">
          <span className="grid size-8 place-items-center rounded-md bg-iris-50 text-primary">
            <Icon aria-hidden className="size-4" strokeWidth={2} />
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Label / value rows inside a SideCard. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="min-w-0 text-right font-semibold wrap-break-word text-fg-strong">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
