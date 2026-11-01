import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import type { CartQuote } from "@/lib/checkout";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Checkout summary card: "Order Summary" · Sub total · Shipping · Discount (when there is one) · Tax,
 * the coupon box, Total, then the step's actions and the secure-checkout note. Figures come from the
 * server quote; `busy` dims them while a new quote loads.
 */
export function OrderSummary({ quote, busy, coupon, actions }: { quote: CartQuote; busy?: boolean; coupon?: ReactNode; actions?: ReactNode }) {
  const row = (label: string, value: string, tone?: "discount") => (
    <div className="flex justify-between gap-4 py-1.5 text-sm text-fg-muted">
      <dt>{label}</dt>
      <dd className={cn("font-semibold tabular-nums", tone === "discount" ? "text-success-600" : "text-fg-strong")}>{value}</dd>
    </div>
  );
  const dim = cn("transition-opacity duration-(--dur-fast)", busy && "opacity-60");
  return (
    <aside aria-labelledby="order-summary-title" className="min-w-0 rounded-lg bg-card p-6 shadow-sm lg:sticky lg:top-36">
      <h2 id="order-summary-title" className="mb-3 font-display text-[1.125rem] font-extrabold text-fg-strong">
        Order Summary
      </h2>
      <dl aria-busy={busy} aria-live="polite" className={dim}>
        {row("Sub total", money(quote.subtotal))}
        {row(quote.needsShipping && quote.shippingMethod === "EXPRESS" ? "Shipping (Express)" : "Shipping", quote.shipping === 0 && quote.itemCount > 0 ? "Free" : money(quote.shipping))}
        {quote.discount > 0 && row("Discount", `− ${money(quote.discount)}`, "discount")}
        {row("Tax", money(quote.tax))}
      </dl>
      <div aria-hidden className="my-4 h-px bg-line" />
      {coupon}
      <dl className={dim}>
        <div className="flex items-baseline justify-between gap-4 pb-5">
          <dt className="text-[1.06rem] font-bold text-fg-strong">Total</dt>
          <dd className="text-[1.5rem] font-extrabold text-primary tabular-nums">{money(quote.total)}</dd>
        </div>
      </dl>
      {actions && <div className="flex flex-col gap-2.5">{actions}</div>}
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-caption text-fg-muted">
        <Lock aria-hidden className="size-3.5" strokeWidth={2} />
        Safe &amp; secure checkout
      </p>
    </aside>
  );
}
