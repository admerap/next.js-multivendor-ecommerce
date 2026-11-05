"use client";

import { Check, ChevronDown, Filter, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";

export type FilterField =
  | { kind: "select"; name: string; label: string; anyLabel: string; options: { value: string; label: string }[] }
  | { kind: "date"; name: string; label: string };

const field =
  "h-11.5 w-full rounded-md border border-line bg-card px-3.5 text-sm font-semibold text-fg-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--iris-100)] focus:outline-none";

/**
 * List toolbar "Filter" button + panel (adminallorders / admincustomerreview designs). A plain GET
 * form: the fields land in the URL with the params in `keep` (status, search); Clear drops the panel's
 * fields only. Starts open when a field is set, so what's applied is visible. Shared by admin lists.
 */
export function FilterPanel({
  action,
  fields,
  values,
  keep,
}: {
  action: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  keep: Record<string, string | undefined>;
}) {
  const active = fields.filter((f) => values[f.name]).length;
  const [open, setOpen] = useState(active > 0);
  const kept = Object.entries(keep).filter((e): e is [string, string] => !!e[1]);
  const clearHref = kept.length ? `${action}?${new URLSearchParams(kept)}` : action;

  return (
    <div className="contents">
      <Button type="button" variant="secondary" aria-expanded={open} aria-controls="list-filters" onClick={() => setOpen((o) => !o)} className="max-sm:flex-1">
        <Filter aria-hidden />
        Filter
        {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[0.68rem] font-bold text-on-primary tabular-nums">{active}</span>}
        <ChevronDown aria-hidden className={open ? "rotate-180" : undefined} />
      </Button>
      {open && (
        <Form id="list-filters" action={action} className="grid basis-full grid-cols-1 gap-3 rounded-lg bg-sunken p-4 sm:grid-cols-2 xl:grid-cols-[repeat(var(--cols),minmax(0,1fr))_auto]" style={{ "--cols": fields.length } as CSSProperties}>
          {kept.map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {fields.map((f) => (
            <label key={f.name} className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-fg-strong">
              {f.label}
              {f.kind === "select" ? (
                <select name={f.name} defaultValue={values[f.name] ?? ""} className={field}>
                  <option value="">{f.anyLabel}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="date" name={f.name} defaultValue={values[f.name] ?? ""} className={field} />
              )}
            </label>
          ))}
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
            <Button asChild variant="secondary" className="max-xl:flex-1">
              <Link href={clearHref}>
                <X aria-hidden />
                Clear
              </Link>
            </Button>
            <Button type="submit" className="max-xl:flex-1">
              <Check aria-hidden />
              Apply
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
