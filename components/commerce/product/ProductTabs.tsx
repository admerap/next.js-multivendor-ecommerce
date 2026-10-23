"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Key = "overview" | "reviews";

/**
 * Overview / Reviews tabs of the product page (design system Tabs, underline style for page sections).
 * Panels are rendered on the server and passed in. The "#reviews" link (rating row) opens the Reviews tab.
 * Arrow keys move between tabs (WAI-ARIA tabs).
 */
export function ProductTabs({ overview, reviews, reviewCount }: { overview: ReactNode; reviews: ReactNode; reviewCount: number }) {
  const [active, setActive] = useState<Key>("overview");
  const base = useId();

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#reviews") setActive("reviews");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tabs: { key: Key; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "reviews", label: `Reviews (${reviewCount})` },
  ];
  const select = (key: Key, focus = false) => {
    setActive(key);
    if (focus) document.getElementById(`${base}-tab-${key}`)?.focus();
  };

  return (
    <section id="reviews" aria-label="Product information" className="scroll-mt-40 rounded-lg bg-card p-5 shadow-sm sm:p-7">
      <div role="tablist" aria-label="Product information" className="mb-6 flex justify-center gap-2 border-b border-line">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              id={`${base}-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${base}-panel-${t.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(t.key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") select(t.key === "overview" ? "reviews" : "overview", true);
              }}
              className={cn(
                "-mb-px inline-flex h-11 items-center border-b-2 px-4 text-[0.94rem] font-bold transition-colors duration-(--dur-fast)",
                on ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg-strong",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.key} id={`${base}-panel-${t.key}`} role="tabpanel" aria-labelledby={`${base}-tab-${t.key}`} hidden={t.key !== active}>
          {t.key === "overview" ? overview : reviews}
        </div>
      ))}
    </section>
  );
}
