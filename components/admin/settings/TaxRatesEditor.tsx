"use client";

import { Check, Search, SearchX } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateTaxRate } from "@/app/admin/(panel)/settings/tax-rates/actions";
import { useCan } from "@/components/admin/AdminPermissions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatTaxRate } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { rateToPercent, TAX_RATE_MAX_PERCENT } from "@/lib/validations/tax";

export type TaxRateItem = { id: string; region: string; name: string; rate: number; isActive: boolean; updatedAt: string };

const updated = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const COLS = "xl:grid xl:grid-cols-[minmax(0,1.6fr)_5rem_10rem_7rem_8rem_7.5rem] xl:items-center xl:gap-4";

/**
 * Admin › Settings › Tax Rates: one row per state (cards ≤1280) — rate as a percent, active switch,
 * Save when something changed. Search by state name or code.
 */
export function TaxRatesEditor({ rates }: { rates: TaxRateItem[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rates;
    // An exact code ("ct") comes first, then states whose name contains the text ("District of Columbia").
    const code = rates.filter((r) => r.region.toLowerCase() === s);
    return [...code, ...rates.filter((r) => !code.includes(r) && r.name.toLowerCase().includes(s))];
  }, [q, rates]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-6">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-card px-3.5 focus-within:border-primary sm:max-w-80">
          <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" strokeWidth={2} />
          <span className="sr-only">Search states</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a state or code (CT)"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
          />
        </label>
        <p className="text-caption text-fg-muted">
          Rates up to {TAX_RATE_MAX_PERCENT}% with up to 3 decimals (e.g. 6.875). New orders use a change right away.
        </p>
      </div>

      <div aria-hidden className={cn("hidden bg-sunken px-6 py-3 text-caption font-bold tracking-[0.04em] text-fg-muted uppercase", COLS)}>
        <span>State</span>
        <span>Code</span>
        <span>Rate</span>
        <span>Active</span>
        <span>Updated</span>
        <span className="text-right">Action</span>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <SearchX aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
          <p className="text-sm text-fg-muted">
            No state matches “<b className="text-fg-strong">{q}</b>”.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <TaxRateRow key={r.id} rate={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaxRateRow({ rate: initial }: { rate: TaxRateItem }) {
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [percent, setPercent] = useState(rateToPercent(initial.rate));
  const [active, setActive] = useState(initial.isActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canUpdate = useCan("taxRates", "update"); // read-only without Tax Rates › Update
  const dirty = percent.trim() !== rateToPercent(saved.rate) || active !== saved.isActive;

  function save() {
    start(async () => {
      const res = await updateTaxRate({ id: saved.id, percent, isActive: active }).catch(() => ({
        success: false as const,
        error: "We couldn't reach the server. Please try again.",
        fieldError: undefined,
      }));
      if (!res.success) {
        setError(res.fieldError ?? null);
        toast.error(res.error);
        return;
      }
      setError(null);
      setSaved({ ...saved, rate: res.data.rate, isActive: res.data.isActive, updatedAt: res.data.updatedAt });
      setPercent(rateToPercent(res.data.rate));
      toast.success(`${saved.name}: ${res.data.isActive ? formatTaxRate(res.data.rate) : "tax turned off"}`);
    });
  }

  return (
    <li aria-label={saved.name} className={cn("flex flex-col gap-3 px-4 py-4 sm:px-6", COLS)}>
      <div className="flex items-center justify-between gap-3 xl:block">
        <p className="font-semibold text-fg-strong">{saved.name}</p>
        <span className="rounded-sm bg-iris-50 px-2 py-0.5 text-caption font-bold text-primary xl:hidden">{saved.region}</span>
      </div>
      <span className="hidden text-sm font-semibold text-fg-muted xl:block">{saved.region}</span>
      <div>
        <label htmlFor={`${id}-rate`} className="mb-1 block text-caption font-semibold text-fg-muted xl:sr-only">
          Rate
        </label>
        <div className={cn("flex h-11 items-center rounded-md border bg-card pr-3 focus-within:border-primary", error ? "border-error-500" : "border-line")}>
          <input
            id={`${id}-rate`}
            value={percent}
            onChange={(e) => {
              setPercent(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            readOnly={!canUpdate}
            aria-label={`${saved.name} tax rate (percent)`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-fg-strong tabular-nums outline-none"
          />
          <span aria-hidden className="text-sm text-fg-muted">
            %
          </span>
        </div>
        {error && (
          <p id={`${id}-err`} role="alert" className="mt-1 text-caption font-semibold text-error-600">
            {error}
          </p>
        )}
      </div>
      <label className="flex min-h-11 items-center gap-2.5 text-sm text-fg">
        <Switch checked={active} onCheckedChange={setActive} disabled={!canUpdate} aria-label={`Charge sales tax in ${saved.name}`} />
        <span className="xl:sr-only">{active ? "Active" : "Off"}</span>
      </label>
      <span className="text-caption text-fg-muted">
        <span className="xl:hidden">Updated </span>
        {updated.format(new Date(saved.updatedAt))}
      </span>
      <div className="xl:text-right">
        {canUpdate && (
          <Button type="button" size="sm" disabled={!dirty || pending} onClick={save} className="max-xl:h-11 max-xl:w-full">
            <Check aria-hidden />
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </li>
  );
}
