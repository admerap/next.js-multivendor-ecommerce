"use client";

import { Truck, Zap } from "lucide-react";
import { EXPRESS_FEE_CENTS, SHIPPING_METHOD_INFO, SHIPPING_METHODS, type CartQuote, type ShippingMethod } from "@/lib/checkout";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

const ICON = { STANDARD: Truck, EXPRESS: Zap } as const;

/**
 * Shipping Method (Shipping & Billing step): Standard or Express for the whole order. Each option shows
 * what this cart's shipping would cost with it (from the server quote), and the summary follows the
 * choice. Standard ships free over the threshold; Express adds a flat fee per seller and is never free.
 */
export function ShippingMethodPicker({ quote, value, onChange, busy }: { quote: CartQuote; value: ShippingMethod; onChange: (m: ShippingMethod) => void; busy?: boolean }) {
  const sellers = quote.stores.filter((s) => s.vendor.id && s.lines.some((l) => l.available && !l.digital)).length;
  const hint: Record<ShippingMethod, string> = {
    STANDARD: quote.freeShipping ? `Free — your order is over ${money(quote.freeShippingThreshold)}` : `Free on orders over ${money(quote.freeShippingThreshold)}`,
    EXPRESS: `${money(EXPRESS_FEE_CENTS)} express fee${sellers > 1 ? ` per seller (${sellers} sellers)` : ""}`,
  };

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-fg-strong">Shipping Method</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {SHIPPING_METHODS.map((m) => {
          const on = value === m;
          const Icon = ICON[m];
          const cost = quote.shippingOptions[m];
          return (
            <label
              key={m}
              className={cn(
                "flex min-h-19 cursor-pointer items-center gap-3.5 rounded-md border-[1.5px] bg-card px-4 py-3.5 transition-colors duration-(--dur-fast)",
                on ? "border-primary bg-iris-50" : "border-line hover:border-iris-200",
              )}
            >
              <input type="radio" name="shipping-method" value={m} checked={on} onChange={() => onChange(m)} className="peer sr-only" />
              <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", on ? "border-primary" : "border-line-default")}>
                {on && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <Icon aria-hidden className={cn("size-5 shrink-0", on ? "text-primary" : "text-fg-muted")} strokeWidth={1.9} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg-strong">{SHIPPING_METHOD_INFO[m].label}</span>
                <span className="block text-caption text-fg-muted">
                  {SHIPPING_METHOD_INFO[m].eta} · {hint[m]}
                </span>
              </span>
              <b className={cn("shrink-0 text-sm tabular-nums transition-opacity", cost === 0 ? "text-success-600" : "text-fg-strong", busy && "opacity-60")}>{cost === 0 ? "Free" : money(cost)}</b>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
