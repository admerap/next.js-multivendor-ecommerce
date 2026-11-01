"use client";

import { ArrowRight, ChevronDown, LoaderCircle, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { hrefWith } from "@/lib/list-params";
import { cn } from "@/lib/utils";

type Current = Record<string, string | number | undefined>;

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search-as-you-type box of the storefront lists. Typing filters after a short pause (the URL's `q` is
 * replaced, so results stay shareable without one history entry per letter); Enter / the button apply
 * at once. It's a real GET form, so it still works before JS loads. `pill` = All Vendors hero,
 * `field` = the store page toolbar.
 */
export function SearchBox({
  pathname,
  current,
  value,
  placeholder,
  label,
  buttonLabel,
  variant,
  className,
}: {
  pathname: string;
  current: Current;
  value: string;
  placeholder: string;
  label: string;
  buttonLabel: string;
  variant: "pill" | "field";
  className?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [pending, start] = useTransition();
  const applied = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL changed from elsewhere (e.g. "Clear all filters") → show that value.
  useEffect(() => {
    if (value !== applied.current) {
      applied.current = value;
      setText(value);
    }
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(raw: string) {
    clearTimeout(timer.current);
    const q = raw.trim().slice(0, 100);
    if (q === applied.current) return;
    applied.current = q;
    start(() => router.replace(hrefWith(pathname, current, { q }), { scroll: false }));
  }

  const Icon = pending ? LoaderCircle : SearchIcon;
  const hidden = Object.entries(current).filter(([k, v]) => k !== "q" && k !== "page" && v !== undefined && v !== "" && !(k === "sort" && v === "default"));

  return (
    <form
      action={pathname}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(text);
      }}
      className={cn(
        variant === "pill"
          ? "relative flex h-13 min-w-0 flex-[1_1_320px] items-center rounded-full bg-card px-1.5 shadow-sm focus-within:outline-2 focus-within:outline-primary sm:max-w-115"
          : "flex h-11 min-w-0 flex-[1_1_240px] items-center rounded-md border border-line bg-sunken pr-1.5 focus-within:border-primary",
        className,
      )}
    >
      {hidden.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      {variant === "pill" && <Icon aria-hidden className={cn("ml-3 size-4.5 shrink-0 text-fg-muted", pending && "animate-spin")} strokeWidth={2} />}
      <input
        type="search"
        name="q"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => apply(v), SEARCH_DEBOUNCE_MS);
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
      />
      {variant === "pill" ? (
        <button type="submit" className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5.5 text-sm font-semibold text-on-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover max-lg:h-11">
          <SearchIcon aria-hidden className="size-4 sm:hidden" strokeWidth={2} />
          <span className="max-sm:sr-only">{buttonLabel}</span>
        </button>
      ) : (
        <button type="submit" aria-label={buttonLabel} className="grid h-8 w-9.5 place-items-center rounded-sm bg-primary text-on-primary hover:bg-primary-hover max-lg:size-11">
          <Icon aria-hidden className={cn("size-4", pending && "animate-spin")} strokeWidth={2.2} />
        </button>
      )}
    </form>
  );
}

/** Filter-bar select: label beside a native select whose choice goes into the URL (goes back to page 1). */
export function UrlSelect({
  label,
  name,
  value,
  options,
  pathname,
  current,
  className,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  pathname: string;
  current: Current;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const id = useId();
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="shrink-0 text-[0.81rem] font-semibold whitespace-nowrap text-fg-muted">
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <select
          id={id}
          value={value}
          aria-busy={pending}
          onChange={(e) => start(() => router.push(hrefWith(pathname, current, { [name]: e.target.value }), { scroll: false }))}
          className="h-11 w-full cursor-pointer appearance-none rounded-md border border-line bg-card pr-10 pl-3.5 text-sm text-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" strokeWidth={2} />
      </div>
    </div>
  );
}

/**
 * Filter-bar price range: "Price  [Min] – [Max] [→]" in whole dollars (on the final, discounted price).
 * Applies on the button or Enter; a reversed range is swapped; empty = no bound.
 */
export function PriceFilter({ min, max, ceiling, pathname, current, className }: { min?: number; max?: number; ceiling: number; pathname: string; current: Current; className?: string }) {
  const router = useRouter();
  const [lo, setLo] = useState(min !== undefined ? String(min / 100) : "");
  const [hi, setHi] = useState(max !== undefined ? String(max / 100) : "");
  const field = "h-11 w-full min-w-0 rounded-md border border-line bg-card px-3 text-sm text-fg-strong tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let a = lo.trim() === "" ? null : Math.max(0, Number(lo));
    let b = hi.trim() === "" ? null : Math.max(0, Number(hi));
    if (a !== null && b !== null && a > b) [a, b] = [b, a];
    router.push(hrefWith(pathname, current, { min: a === null || Number.isNaN(a) ? "" : a, max: b === null || Number.isNaN(b) ? "" : b }), { scroll: false });
  }

  return (
    <form onSubmit={apply} role="group" aria-label="Price range" className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="shrink-0 text-[0.81rem] font-semibold text-fg-muted">Price</span>
      <input type="number" inputMode="decimal" min={0} step="any" value={lo} onChange={(e) => setLo(e.target.value)} placeholder="Min" aria-label="Minimum price" className={field} />
      <span aria-hidden className="text-fg-muted">–</span>
      <input type="number" inputMode="decimal" min={0} step="any" value={hi} onChange={(e) => setHi(e.target.value)} placeholder={ceiling > 0 ? String(ceiling) : "Max"} aria-label="Maximum price" className={field} />
      <button type="submit" aria-label="Apply price" className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-on-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover">
        <ArrowRight aria-hidden className="size-4.5" strokeWidth={2.2} />
      </button>
    </form>
  );
}
