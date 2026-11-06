"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * List search + rows per page (the same behaviour as ListToolbar): the table filters as you type — the URL's ?q
 * updates 350ms after the last key (Enter: at once) — and "N / page" sets ?pageSize. Both keep every other filter
 * in the URL and go back to page 1, so the server still paginates and reloads / bookmarks / shares work.
 * `action`: the list's path · `q`: the current search (from the server) · `pageSizes` / `defaultPageSize`: what
 * the list's schema accepts (the default size is left out of the URL) · `keep`: kept for older callers — every
 * other param is preserved anyway.
 */
export function SearchForm({
  action,
  q: initial,
  placeholder,
  pageSizes = [10, 20, 50],
  defaultPageSize = 10,
}: {
  action: string;
  q: string;
  placeholder: string;
  keep?: Record<string, string | undefined>;
  pageSizes?: number[] | false;
  defaultPageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial);
  const first = useRef(true);
  // Back / forward (or any outside change of ?q) puts the box back in step with the URL.
  const urlQ = params.get("q") ?? "";
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    if (urlQ !== q.trim()) setQ(urlQ);
  }
  const path = action || pathname;

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "pageSize" && v === String(defaultPageSize))) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // a new search or size starts from page 1
    startTransition(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Filter as you type: ask the server 350ms after the last key.
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
    <form
      role="search"
      action={path}
      onSubmit={(e) => {
        e.preventDefault();
        update({ q: q.trim() }); // Enter: no need to wait for the debounce
      }}
      className={cn("flex min-w-0 flex-[1_1_280px] flex-wrap gap-2 sm:flex-nowrap", pending && "opacity-80")}
    >
      <label className="flex h-11.5 min-w-0 flex-[1_1_200px] items-center rounded-md border border-line bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]">
        <Search aria-hidden className="ml-3.5 size-4.5 shrink-0 text-fg-muted" strokeWidth={1.9} />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="mr-1 grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:text-primary"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </label>
      {pageSizes && (
        <Select value={params.get("pageSize") ?? String(defaultPageSize)} onValueChange={(v) => update({ pageSize: v })}>
          <SelectTrigger aria-label="Rows per page" className="min-w-0 flex-[1_1_8.5rem] sm:w-34 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </form>
  );
}
