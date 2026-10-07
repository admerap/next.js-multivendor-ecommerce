"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ToolbarFilter = {
  /** URL search param, e.g. "category". */
  param: string;
  label: string;
  allLabel: string;
  options: { id: string; label: string }[];
  /** Params reset when this filter changes (e.g. choosing a category clears the sub-category). */
  clears?: string[];
  disabled?: boolean;
};

const ACTIVE_INACTIVE = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/** Search (debounced), parent filters, status, sort and page size — all kept in the URL so the server paginates. */
export function ListToolbar({
  searchLabel,
  filters = [],
  statuses = ACTIVE_INACTIVE,
  sorts,
  actions,
}: {
  searchLabel: string;
  filters?: ToolbarFilter[];
  /** Options of the status filter (after "All statuses"); `null` hides it, e.g. on a single-status queue. */
  statuses?: { value: string; label: string }[] | null;
  /** Optional sort menu (URL param "sort"); the first option is the default and is left out of the URL. */
  sorts?: { value: string; label: string }[];
  /** Extra controls at the end of the bar, e.g. an "Add" button. */
  actions?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "ALL" || (k === "pageSize" && v === "10")) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // any filter change starts from page 1
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounce typing: query the server 350ms after the admin stops typing.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q.trim()) update({ q: q.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [q]);

  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5", pending && "opacity-80")}>
      <div className="flex h-11.5 min-w-0 flex-[1_1_240px] items-center rounded-md border border-line bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)] sm:max-w-95">
        <Search aria-hidden className="ml-3.5 size-4.5 shrink-0 text-fg-muted" strokeWidth={1.9} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="mr-1 grid size-9 place-items-center rounded-md text-fg-muted hover:text-fg-strong">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-[1_1_100%] flex-wrap gap-3 sm:ml-auto sm:flex-none xl:flex-nowrap">
        {filters.map((f) => (
          <Select
            key={f.param}
            value={params.get(f.param) ?? "ALL"}
            disabled={f.disabled}
            onValueChange={(v) => update({ [f.param]: v, ...Object.fromEntries((f.clears ?? []).map((c) => [c, null])) })}
          >
            <SelectTrigger aria-label={f.label} className={cn("min-w-0 flex-[1_1_100%] sm:w-44 sm:flex-none [&>span]:truncate", f.disabled && "cursor-not-allowed opacity-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{f.allLabel}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {statuses && (
          <Select value={params.get("status") ?? "ALL"} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger aria-label="Filter by status" className="min-w-0 flex-[1_1_8.5rem] sm:w-40 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {sorts && sorts.length > 0 && (
          <Select value={params.get("sort") ?? sorts[0].value} onValueChange={(v) => update({ sort: v === sorts[0].value ? null : v })}>
            <SelectTrigger aria-label="Sort by" className="min-w-0 flex-[1_1_8.5rem] sm:w-44 sm:flex-none [&>span]:truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorts.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={params.get("pageSize") ?? "10"} onValueChange={(v) => update({ pageSize: v })}>
          <SelectTrigger aria-label="Rows per page" className="min-w-0 flex-[1_1_8.5rem] sm:w-34 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["10", "20", "50"].map((n) => (
              <SelectItem key={n} value={n}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {actions && <div className="flex w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
      </div>
    </div>
  );
}
