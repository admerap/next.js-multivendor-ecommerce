"use client";

import { Minus, Plus } from "lucide-react";
import type { QuickViewProduct } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import type { useProductPurchase } from "./useProductPurchase";

type Purchase = ReturnType<typeof useProductPurchase>;

/**
 * One chip group per option (Color, Size…). A value sold out in every combination is disabled and struck
 * through; a value that's only sold out with the current other choices stays clickable (dashed) and moves
 * them to an in-stock combination.
 */
export function VariationPickers({ product: p, purchase: s, onChange }: { product: QuickViewProduct; purchase: Purchase; onChange?: () => void }) {
  return (
    <>
      {p.options.map((o) => (
        <fieldset key={o.name}>
          <legend className="mb-2.5 text-[0.81rem] font-bold text-fg-strong">
            {o.name} <span className="font-medium text-fg-muted">— {s.pick[o.name] ?? "Choose"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((val) => {
              const on = s.pick[o.name] === val;
              const any = s.inStockAnywhere(o.name, val);
              const fits = s.fitsPick(o.name, val);
              return (
                <button
                  key={val}
                  type="button"
                  aria-pressed={on}
                  disabled={!any}
                  onClick={() => {
                    s.choose(o.name, val);
                    onChange?.();
                  }}
                  title={!any ? "Out of stock" : !fits ? "Available in other combinations" : undefined}
                  className={cn(
                    "inline-flex h-10 min-w-11 items-center justify-center rounded-md border px-3.5 text-sm font-semibold transition-colors duration-(--dur-fast) max-lg:h-11",
                    on ? "border-primary bg-iris-50 text-primary" : "border-line bg-card text-fg hover:border-primary",
                    any && !fits && !on && "border-dashed text-fg-muted",
                    !any && "cursor-not-allowed text-fg-subtle line-through opacity-60 hover:border-line",
                  )}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </>
  );
}

/** Qty stepper bounded by the minimum order and the chosen variation's stock (44px buttons). */
export function QtyStepper({ purchase: s }: { purchase: Purchase }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center overflow-hidden rounded-md border-[1.5px] border-line" role="group" aria-label="Quantity">
        <button type="button" onClick={() => s.setQty(s.qty - 1)} disabled={s.qty <= s.minQty} aria-label="Decrease quantity" className="grid size-11 place-items-center bg-card text-fg disabled:opacity-40">
          <Minus aria-hidden className="size-4" strokeWidth={2} />
        </button>
        <span aria-live="polite" className="min-w-14 text-center font-bold text-fg-strong tabular-nums">
          {s.qty}
        </span>
        <button
          type="button"
          onClick={() => s.setQty(s.qty + 1)}
          disabled={s.qty >= s.maxQty}
          aria-label={s.qty >= s.maxQty && Number.isFinite(s.stock) ? `Only ${s.stock} in stock` : "Increase quantity"}
          className="grid size-11 place-items-center bg-card text-fg disabled:opacity-40"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </div>
      {s.minQty > 1 && <span className="text-caption text-fg-muted">Min. order {s.minQty}</span>}
    </div>
  );
}
