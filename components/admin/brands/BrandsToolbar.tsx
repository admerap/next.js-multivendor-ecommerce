"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { BrandOption } from "@/app/admin/(panel)/brands/actions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Search (debounced), brand + status filters and page size — all kept in the URL so the server paginates. */
export function BrandsToolbar({ brands }: { brands: BrandOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || ((k === "status" || k === "brand") && v === "ALL") || (k === "pageSize" && v === "10")) next.delete(k);
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
      <div className="flex h-11.5 min-w-0 flex-[1_1_240px] items-center rounded-md border border-line bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]">
        <Search aria-hidden className="ml-3.5 size-4.5 shrink-0 text-fg-muted" strokeWidth={1.9} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands by name"
          aria-label="Search brands by name"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="mr-1 grid size-9 place-items-center rounded-md text-fg-muted hover:text-fg-strong max-lg:mr-0 max-lg:size-11">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-[1_1_100%] flex-wrap justify-end gap-3 sm:ml-auto sm:flex-[0_1_auto]">
        <SearchableSelect
          value={params.get("brand") ?? "ALL"}
          onValueChange={(v) => update({ brand: v })}
          options={[{ value: "ALL", label: "All brands" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
          placeholder="All brands"
          searchPlaceholder="Search brands…"
          emptyText="No brand matches"
          ariaLabel="Filter by brand"
          className="min-w-0 flex-[1_1_100%] sm:w-44 sm:flex-none"
        />
        <Select value={params.get("status") ?? "ALL"} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger aria-label="Filter by status" className="min-w-0 flex-[1_1_8.5rem] sm:w-40 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={params.get("pageSize") ?? "10"} onValueChange={(v) => update({ pageSize: v })}>
          <SelectTrigger aria-label="Rows per page" className="min-w-0 flex-[1_1_8.5rem] sm:w-34 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["10", "20", "50"].map((n) => (
              <SelectItem key={n} value={n}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
