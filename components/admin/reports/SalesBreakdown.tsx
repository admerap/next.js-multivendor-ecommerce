import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { DashCard } from "@/components/data/DashCard";
import type { SalesGroup } from "@/lib/admin-reports.server";
import { money } from "@/lib/money";
import type { Tone } from "@/lib/tones";

/**
 * Product Report sales breakdown (by category / by store): one row per group with its products, units and
 * amount sold, and a bar sized against the best group. Groups with no sales still show their product count.
 */
export function SalesBreakdown({
  title,
  subtitle,
  icon,
  tone,
  groups,
  href,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
  groups: SalesGroup[];
  /** where a row leads (e.g. the report filtered to that store) */
  href?: (g: SalesGroup) => string;
}) {
  const max = Math.max(1, ...groups.map((g) => g.revenue));
  return (
    <DashCard title={title} icon={icon} tone={tone} subtitle={subtitle}>
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">Nothing to show yet.</p>
      ) : (
        <ul className="mt-4 flex max-h-96 flex-col gap-3.5 overflow-y-auto overscroll-contain pr-1">
          {groups.map((g) => {
            const name = href ? (
              <Link href={href(g)} className="inline-flex min-h-11 items-center truncate font-semibold !text-fg-strong hover:!text-primary lg:min-h-0">
                {g.name}
              </Link>
            ) : (
              <span className="truncate font-semibold text-fg-strong">{g.name}</span>
            );
            return (
              <li key={g.id} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{name}</span>
                  <b className="shrink-0 font-semibold text-fg-strong tabular-nums">{money(g.revenue)}</b>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  {/* runtime value: share of the best group's sales */}
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(g.revenue / max) * 100}%` }} />
                </div>
                <p className="mt-1 text-caption text-fg-muted tabular-nums">
                  {g.units.toLocaleString("en-US")} {g.units === 1 ? "unit" : "units"} sold · {g.products} {g.products === 1 ? "product" : "products"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </DashCard>
  );
}
