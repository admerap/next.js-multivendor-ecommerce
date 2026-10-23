"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CategoryGroups, CategoryThumb } from "@/components/commerce/CategoryMegaMenu";
import { categoryHref, type CategoryNode } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Home hero row (Sundry Home design): category list on the left (≥1025px) and the hero banner
 * (`children`). Hovering or focusing a category opens its sub-categories as a flyout over the banner;
 * leaving the row or pressing Escape closes it. Real tree from getCategoryTree().
 */
export function HeroCategoryMenu({ tree, children }: { tree: CategoryNode[]; children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const cat = tree.find((c) => c.slug === active) ?? null;

  return (
    <div
      className="relative flex flex-wrap gap-4"
      onMouseLeave={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setActive(null);
      }}
    >
      <aside aria-label="All categories" className="hidden max-w-70 min-w-0 flex-[1_1_240px] flex-col rounded-xl bg-card p-2 shadow-sm lg:flex">
        {tree.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-fg-muted">Categories are coming soon.</p>
        ) : (
          <ul className="flex flex-col">
            {tree.map((c) => {
              const on = c.slug === active;
              return (
                <li key={c.slug}>
                  <Link
                    href={categoryHref(c.slug)}
                    onMouseEnter={() => setActive(c.slug)}
                    onFocus={() => setActive(c.slug)}
                    aria-expanded={on}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-(--dur-fast)",
                      on ? "bg-iris-50 !text-primary" : "!text-fg hover:bg-iris-50 hover:!text-primary",
                    )}
                  >
                    <CategoryThumb category={c} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <ChevronRight aria-hidden className={cn("size-4 shrink-0", on ? "text-primary" : "text-fg-subtle")} strokeWidth={2} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {cat && (
        <div className="absolute inset-y-0 right-0 left-74 z-30 hidden overflow-y-auto rounded-xl border border-line bg-card px-8 py-7 shadow-xl lg:block">
          <div className="mb-5 flex items-center gap-2.5">
            <CategoryThumb category={cat} />
            <Link href={categoryHref(cat.slug)} className="font-display text-[1.25rem] font-extrabold tracking-[-0.02em] !text-fg-strong hover:!text-primary">
              {cat.name}
            </Link>
          </div>
          <CategoryGroups category={cat} className="grid-cols-2 xl:grid-cols-4" />
        </div>
      )}

      <div className="min-w-0 flex-[2_1_420px]">{children}</div>
    </div>
  );
}
