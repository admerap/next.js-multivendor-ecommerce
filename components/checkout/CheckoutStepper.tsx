import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Cart", href: "/checkout" },
  { label: "Shipping & Billing", href: "/checkout?step=shipping" },
  { label: "Payment", href: null },
] as const;

/**
 * Checkout stepper (DESIGN_SYSTEM CheckoutStepper): Cart → Shipping & Billing → Payment, centred, each
 * number with its label underneath. Completed steps get a check and link back; later steps aren't links
 * (Payment unlocks only after Shipping & Billing).
 */
export function CheckoutStepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Checkout progress" className="mx-auto w-full max-w-140">
      <ol className="grid grid-cols-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const on = i === current;
          const body = (
            <>
              <span
                className={cn(
                  "relative z-1 grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums",
                  done ? "bg-primary text-on-primary" : on ? "border-2 border-primary bg-card text-primary shadow-primary" : "border border-line-default bg-card text-fg-muted",
                )}
              >
                {done ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-center text-[0.81rem] font-semibold", on ? "text-fg-strong" : done ? "text-primary" : "text-fg-muted")}>{s.label}</span>
            </>
          );
          return (
            <li key={s.label} className="relative flex justify-center" aria-current={on ? "step" : undefined}>
              {/* Connector to the next step, from this dot's centre to the next one's */}
              {i < STEPS.length - 1 && <span aria-hidden className={cn("absolute top-4.5 left-1/2 h-0.5 w-full", done ? "bg-primary" : "bg-line-default")} />}
              {done && s.href ? (
                <Link href={s.href} className="flex min-h-11 flex-col items-center gap-1.5 !text-primary">
                  {body}
                </Link>
              ) : (
                <span className="flex min-h-11 flex-col items-center gap-1.5">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
