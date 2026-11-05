import { ChevronDown, Filter, RotateCcw, type LucideIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconTile } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";
import { REPORT_RANGE_LABEL, REPORT_RANGES } from "@/lib/validations/vendor-report";
import { toneClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

/**
 * Building blocks shared by the Seller Center and Admin reports (vendor*report / admin*report designs). Filters and search
 * are plain GET forms: every choice lands in the URL, so a report reloads, bookmarks and shares as is,
 * and works without JavaScript.
 */

/** Page title with its icon tile (no count — reports aren't lists). */
export function ReportHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
        <Icon aria-hidden className="size-5" strokeWidth={1.9} />
      </span>
      {title}
    </h1>
  );
}

const selectClass =
  "h-11.5 w-full cursor-pointer appearance-none rounded-md border border-line bg-card pr-10 pl-3.5 text-sm font-semibold text-fg-strong transition-[border-color,box-shadow] duration-(--dur-fast) focus:border-primary focus:shadow-[0_0_0_3px_var(--iris-100)] focus:outline-none";

function NativeSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <label className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
      <span className="text-sm font-semibold text-fg-strong">{label}</span>
      <span className="relative">
        <select name={name} defaultValue={value} className={selectClass}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" />
      </span>
    </label>
  );
}

export type ReportSelect = { name: string; label: string; value: string; options: { value: string; label: string }[] };

const VENDOR_RANGES = REPORT_RANGES.map((r) => ({ value: r, label: REPORT_RANGE_LABEL[r] }));

/**
 * "Filter Data" card: Date range (+ the report's own selects) · Reset Filter · Filter. Submitting starts
 * over from page 1 and clears the search; `keep` carries params that aren't filters (e.g. the tab).
 * `ranges`: the date presets (default: the vendor reports' three; the admin adds Last year). No `range`
 * (e.g. the live stock report) = no date select.
 */
export function ReportFilters({
  action,
  range,
  ranges = VENDOR_RANGES,
  selects = [],
  keep = {},
}: {
  action: string;
  range?: string;
  ranges?: { value: string; label: string }[];
  selects?: ReportSelect[];
  keep?: Record<string, string | undefined>;
}) {
  const kept = Object.entries(keep).filter((e): e is [string, string] => !!e[1]);
  const resetHref = kept.length ? `${action}?${new URLSearchParams(kept)}` : action;
  return (
    <section aria-labelledby="report-filters" className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
      <h2 id="report-filters" className="mb-4 font-display text-lg font-bold text-fg-strong">
        Filter Data
      </h2>
      <Form action={action} className="flex flex-wrap items-end gap-3">
        {kept.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {range !== undefined && <NativeSelect name="range" label="Date range" value={range} options={ranges} />}
        {selects.map((s) => (
          <NativeSelect key={s.name} {...s} />
        ))}
        <div className="flex w-full gap-3 sm:w-auto">
          <Button asChild variant="secondary" className="max-sm:flex-1">
            <Link href={resetHref}>
              <RotateCcw aria-hidden />
              Reset Filter
            </Link>
          </Button>
          <Button type="submit" className="max-sm:flex-1">
            <Filter aria-hidden />
            Filter
          </Button>
        </div>
      </Form>
    </section>
  );
}

/** A big figure with its label and icon tile (the designs' stat cards). */
export function StatCard({ icon, tone, value, label, className, children }: { icon: LucideIcon; tone: Tone; value: ReactNode; label: string; className?: string; children?: ReactNode }) {
  return (
    <section aria-label={label} className={cn("min-w-0 rounded-lg bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center gap-3.5">
        <IconTile icon={icon} tone={tone} size="lg" />
        <div className="min-w-0">
          <div className="truncate font-display text-[1.6rem] leading-tight font-extrabold tracking-[-0.02em] text-fg-strong tabular-nums">{value}</div>
          <div className="text-caption text-fg-muted">{label}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Small figures under a stat card (e.g. Canceled · Ongoing · Completed), coloured by tone. */
export function StatSplit({ items }: { items: { label: string; value: ReactNode; tone: Tone; hint?: string }[] }) {
  return (
    <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
      {items.map((i) => (
        // Label first for screen readers; shown under the figure.
        <div key={i.label} title={i.hint} className="flex min-w-0 flex-col-reverse rounded-md bg-sunken px-1 py-2.5 text-center">
          <dt className="text-[0.72rem] leading-tight text-fg-muted">{i.label}</dt>
          <dd className={cn("font-display text-lg font-extrabold tabular-nums", toneClasses[i.tone].fg)}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Coloured-dot legend under a chart; `dot` is a bg-* token class. */
export function Legend({ items }: { items: { label: string; value: ReactNode; dot: string }[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2.5 text-sm">
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", i.dot)} />
          <span className="min-w-0 flex-1 truncate text-fg-muted">{i.label}</span>
          <b className="font-semibold text-fg-strong tabular-nums">{i.value}</b>
        </li>
      ))}
    </ul>
  );
}

/** Report section tabs (All Products / Products Stock, Order / Expense Transactions): links, so they live in the URL. */
export function ReportTabs({ tabs, label = "Report sections" }: { tabs: { label: string; href: string; current: boolean }[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors duration-(--dur-fast)",
            t.current ? "bg-primary !text-on-primary shadow-primary" : "bg-card !text-fg-muted shadow-xs hover:!text-primary",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Payment Statistics donut + legend data (Order and Transactions Reports): amounts by payment status. */
export const paymentDonut = (p: { paid: number; unpaid: number; refunded: number }) => [
  // label: chart tooltip · legend: the short form that fits the narrow column
  { label: "Completed payments", legend: "Completed", value: p.paid, token: "--success-500", dot: "bg-success-500" },
  { label: "Pending payments", legend: "Pending", value: p.unpaid, token: "--saffron-400", dot: "bg-saffron-400" },
  { label: "Refunded", legend: "Refunded", value: p.refunded, token: "--error-500", dot: "bg-error-500" },
];

/** A figure the store's past orders don't record (e.g. the product's own discount): "—", with a reason. */
export function NotRecorded({ reason = "Not recorded for past orders" }: { reason?: string }) {
  return (
    <span title={reason} className="text-fg-subtle">
      —<span className="sr-only"> ({reason})</span>
    </span>
  );
}
