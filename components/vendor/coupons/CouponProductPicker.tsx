"use client";

import { Check, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { searchCouponProducts, type CouponProductOption } from "@/app/vendor/(panel)/coupons/actions";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { cn } from "@/lib/utils";

/**
 * "Specific products" picker: searches ONLY this vendor's products on the server (debounced),
 * checklist of results, selected products as removable chips above.
 */
export function CouponProductPicker({
  id,
  selected,
  onChange,
  error,
  disabled,
}: {
  id: string;
  selected: CouponProductOption[];
  onChange: (products: CouponProductOption[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ items: CouponProductOption[]; busy: boolean; failed: boolean }>({ items: [], busy: true, failed: false });
  const chosen = new Set(selected.map((p) => p.id));

  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => ({ ...s, busy: true, failed: false }));
      searchCouponProducts(query)
        .then((r) => setState(r.success && r.data ? { items: r.data, busy: false, failed: false } : { items: [], busy: false, failed: true }))
        .catch(() => setState({ items: [], busy: false, failed: true }));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = (p: CouponProductOption) => onChange(chosen.has(p.id) ? selected.filter((x) => x.id !== p.id) : [...selected, p]);

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border p-3", error ? "border-error-500" : "border-line")}>
      {selected.length > 0 && (
        <ul role="list" aria-label="Selected products" className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <li key={p.id} className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-iris-50 pr-0.5 pl-3 text-[0.82rem] font-semibold text-primary max-lg:h-11 max-lg:pr-0">
              <span className="truncate">{p.name}</span>
              <button
                type="button"
                onClick={() => toggle(p)}
                disabled={disabled}
                aria-label={`Remove ${p.name}`}
                className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-iris-100 max-lg:size-11"
              >
                <X aria-hidden className="size-3.5" strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex h-11 items-center gap-2 rounded-md border border-line bg-card px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-100)]">
        <Search aria-hidden className="size-4 shrink-0 text-fg-muted" strokeWidth={2} />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your products by name or SKU"
          aria-label="Search your products by name or SKU"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <div role="group" aria-label="Your products" aria-busy={state.busy || undefined} className="max-h-72 overflow-y-auto">
        {state.busy && state.items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-fg-muted">Loading your products…</p>
        ) : state.failed ? (
          <p className="px-2 py-3 text-sm text-error-600">Couldn&apos;t load your products. Try searching again.</p>
        ) : state.items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-fg-muted">{query ? "No products match your search." : "You don't have any products yet."}</p>
        ) : (
          <ul role="list" className="flex flex-col">
            {state.items.map((p) => {
              const on = chosen.has(p.id);
              return (
                <li key={p.id}>
                  <label className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-(--dur-fast) hover:bg-hover", on && "bg-iris-50")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(p)} disabled={disabled} className="peer sr-only" />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-sm border transition-colors duration-(--dur-fast) peer-focus-visible:outline-2 peer-focus-visible:outline-primary",
                        on ? "border-primary bg-primary text-on-primary" : "border-line-default bg-card",
                      )}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <ProductThumb src={p.thumbnail} name={p.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg-strong">{p.name}</span>
                      <span className="block truncate text-caption text-fg-muted">SKU {p.sku}</span>
                    </span>
                    <ApprovalBadge status={p.approvalStatus} />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-caption text-fg-muted" aria-live="polite">
        {selected.length} {selected.length === 1 ? "product" : "products"} selected · only your store&apos;s products are listed
      </p>
    </div>
  );
}
