import { Wallet } from "lucide-react";
import { DoughnutChart } from "@/components/data/Chart";
import { DashCard } from "@/components/data/DashCard";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Admin reports' Payment Statistics card (adminearningreports / adminorderreport designs): what customers
 * paid, by method. The designs are Stripe-only; Sundry is cash on delivery today, so COD leads and
 * Card (Stripe) stays at $0 until the Stripe integration ships. Refunded = payments marked REFUNDED.
 */
export function PaymentStats({ payments, subtitle }: { payments: { cod: number; stripe: number; refunded: number }; subtitle: string }) {
  const pay = [
    { label: "Cash (COD)", value: payments.cod, token: "--color-primary", dot: "bg-primary" },
    { label: "Card (Stripe)", value: payments.stripe, token: "--saffron-400", dot: "bg-saffron-400" },
    { label: "Refunded", value: payments.refunded, token: "--error-500", dot: "bg-error-500" },
  ];
  const all = pay.reduce((a, p) => a + p.value, 0);
  return (
    <DashCard title="Payment Statistics" icon={Wallet} tone="saffron" subtitle={subtitle}>
      <div className="relative mx-auto mt-5 size-48">
        <DoughnutChart className="absolute inset-0" label="Payment statistics chart" format="cents" labels={pay.map((p) => p.label)} data={pay.map((p) => p.value)} tokens={pay.map((p) => p.token)} />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money(payments.cod + payments.stripe)}</div>
            <div className="text-caption text-fg-muted">Received</div>
          </div>
        </div>
      </div>
      {/* Amount and share stacked on the right, so the label never truncates in the narrow column. */}
      <ul className="mt-5 flex flex-col gap-2.5">
        {pay.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5 text-sm">
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", p.dot)} />
            <span className="min-w-0 flex-1 text-fg-muted">{p.label}</span>
            <span className="text-right leading-tight">
              <b className="block font-semibold text-fg-strong tabular-nums">{money(p.value)}</b>
              <span className="text-caption text-fg-muted tabular-nums">{all ? Math.round((p.value / all) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption text-fg-muted">Cash on delivery only for now — card payments arrive with Stripe.</p>
    </DashCard>
  );
}
