"use client";

import { useEffect, useId, useState } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import type { ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { productGridClass, SectionEmpty } from "./HomeSection";

export type PopularTab = { key: "best" | "rated" | "trend"; label: string; products: ProductCardData[]; empty: string };

/** Hash → tab, so the footer's "Best Selling Product" / "Top Rated Product" links open the right one. */
const FROM_HASH: Record<string, PopularTab["key"]> = { "#best-selling": "best", "#top-rated": "rated" };

/**
 * "Popular right now" pill tabs (design system Tabs): Best Selling · Top Rated · Trending. All three
 * lists come from the server; switching is instant. Arrow keys move between tabs (WAI-ARIA tabs).
 */
export function PopularTabs({ tabs }: { tabs: PopularTab[] }) {
  const [active, setActive] = useState<PopularTab["key"]>(tabs[0]!.key);
  const base = useId();

  useEffect(() => {
    const sync = () => {
      const k = FROM_HASH[window.location.hash];
      if (k) setActive(k);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tab = tabs.find((t) => t.key === active) ?? tabs[0]!;
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.key === active);
    const next = tabs[(i + dir + tabs.length) % tabs.length]!;
    setActive(next.key);
    document.getElementById(`${base}-tab-${next.key}`)?.focus();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 id="best-selling-title" className="font-display text-[clamp(22px,3.2vw,30px)] font-extrabold tracking-[-0.02em] text-fg-strong">
          Popular right now
        </h2>
        <div role="tablist" aria-labelledby="best-selling-title" className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const on = t.key === tab.key;
            return (
              <button
                key={t.key}
                id={`${base}-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${base}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(t.key)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") move(1);
                  if (e.key === "ArrowLeft") move(-1);
                }}
                className={cn(
                  "inline-flex h-9.5 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors duration-(--dur-fast) max-lg:h-11",
                  on ? "border-transparent bg-primary text-on-primary" : "border-line bg-card text-fg hover:border-primary hover:text-primary",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${tab.key}`}>
        {tab.products.length ? (
          <ul role="list" className={productGridClass}>
            {tab.products.map((p) => (
              <li key={p.id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        ) : (
          <SectionEmpty title={`No ${tab.label.toLowerCase()} products yet`} text={tab.empty} />
        )}
      </div>
    </>
  );
}
