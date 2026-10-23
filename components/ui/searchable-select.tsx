"use client";

import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string; hint?: string };

/** cmdk item value: label plus the id so it is unique (the id is never searched — see `matches`). */
const itemKey = (o: SearchOption) => `${o.label} ${o.value}`;

/** Plain "contains" match on the label (and hint), case/accent-insensitive — predictable for catalogs. */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const matches = (_value: string, search: string, keywords?: string[]) => (keywords ?? []).some((k) => fold(k).includes(fold(search.trim()))) ? 1 : 0;

/**
 * DESIGN_SYSTEM §5 Select with a search box (combobox). Same trigger frame and panel as Select.
 * - Client mode (`options`): every option is loaded; typing filters them in the browser.
 * - Server mode (`load`): typing asks the server for matches (debounced), e.g. thousands of brands.
 *   Pass `selectedLabel` so the trigger can name a value that isn't in the current results.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  load,
  selectedLabel,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No results",
  disabled = false,
  loading = false,
  invalid = false,
  describedBy,
  ariaLabel,
  ariaLabelledby,
  className,
  portal = true,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options?: SearchOption[];
  load?: (query: string) => Promise<SearchOption[]>;
  selectedLabel?: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Parent options are being fetched: shows "Loading…" and blocks opening. */
  loading?: boolean;
  invalid?: boolean;
  describedBy?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  className?: string;
  /** Render the panel in place (inside dialogs) instead of a body portal. */
  portal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  /** label of the last picked option, so server-mode triggers keep naming it after new searches */
  const [picked, setPicked] = useState<SearchOption | null>(null);
  const [query, setQuery] = useState("");
  /** highlighted item; set explicitly in server mode so Enter always picks a current result */
  const [active, setActive] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [remote, setRemote] = useState<{ query: string; items: SearchOption[]; busy: boolean; failed: boolean }>({ query: "", items: [], busy: false, failed: false });
  const listId = id ? `${id}-list` : undefined;

  // Server mode: fetch matches 250ms after typing stops (and once on open).
  useEffect(() => {
    if (!load || !open) return;
    const q = query.trim();
    const t = setTimeout(() => {
      setRemote((r) => ({ ...r, busy: true, failed: false }));
      load(q)
        .then((items) => {
          setRemote({ query: q, items, busy: false, failed: false });
          setActive(items[0] ? itemKey(items[0]) : "");
        })
        .catch(() => setRemote((r) => ({ ...r, busy: false, failed: true })));
    }, 250);
    return () => clearTimeout(t);
  }, [load, open, query]);

  const items = load ? remote.items : (options ?? []);
  const current = useMemo(() => (options ?? remote.items).find((o) => o.value === value)?.label ?? (value && picked?.value === value ? picked.label : undefined) ?? (value ? selectedLabel : undefined), [options, remote.items, value, picked, selectedLabel]);
  const blocked = disabled || loading;

  const panel = (
    <PopoverPrimitive.Content
      align="start"
      sideOffset={6}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
      }}
      className="z-110 w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-lg border border-line bg-card shadow-xl"
    >
      {/* cmdk names its search box from `label` (aria-labelledby), so it must differ from the trigger name. */}
      <Command shouldFilter={!load} filter={matches} loop label={searchPlaceholder} {...(load && { value: active, onValueChange: setActive })}>
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search aria-hidden className="size-4 shrink-0 text-fg-muted" strokeWidth={2} />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
          />
        </div>
        <Command.List id={listId} className="max-h-64 overflow-y-auto p-1.5">
          {load && remote.busy && <Command.Loading className="px-3 py-2.5 text-sm text-fg-muted">Searching…</Command.Loading>}
          {load && remote.failed && <p className="px-3 py-2.5 text-sm text-error-600">Couldn&apos;t search. Try again.</p>}
          {!(load && (remote.busy || remote.failed)) && <Command.Empty className="px-3 py-2.5 text-sm text-fg-muted">{emptyText}</Command.Empty>}
          {items.map((o) => (
            <Command.Item
              key={o.value}
              value={itemKey(o)}
              keywords={o.hint ? [o.label, o.hint] : [o.label]}
              onSelect={() => {
                setPicked(o);
                onValueChange(o.value);
                setOpen(false);
                setQuery("");
              }}
              className="relative flex min-h-10.5 cursor-pointer items-center rounded-md pr-9 pl-3 text-sm font-semibold text-fg outline-none select-none data-[selected=true]:bg-iris-50 data-[selected=true]:text-primary max-lg:min-h-11"
            >
              <span className="truncate">{o.label}</span>
              {o.hint && <span className="ml-1.5 shrink-0 font-normal text-fg-subtle">{o.hint}</span>}
              {o.value === value && <Check aria-hidden className="absolute right-3 size-4 text-primary" strokeWidth={2.4} />}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </PopoverPrimitive.Content>
  );

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverPrimitive.Trigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-busy={loading || undefined}
        disabled={blocked}
        className={cn(
          "flex h-11.5 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-card px-3.5 text-left text-sm font-semibold text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-[1.5px] aria-invalid:border-error-500",
          className,
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 font-normal text-fg-muted">
            <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-line-default border-t-primary" />
            Loading…
          </span>
        ) : (
          <span className={cn("truncate", !current && "font-normal text-fg-subtle")}>{current ?? placeholder}</span>
        )}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-muted" />
      </PopoverPrimitive.Trigger>
      {portal ? <PopoverPrimitive.Portal>{panel}</PopoverPrimitive.Portal> : panel}
    </PopoverPrimitive.Root>
  );
}

