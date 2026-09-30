"use client";

import {
  ArrowUpRight,
  BadgePercent,
  ChartLine,
  ChevronDown,
  CircleCheck,
  CreditCard,
  Hourglass,
  Inbox,
  LayoutGrid,
  Receipt,
  Star,
  Trophy,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { LineChart } from "@/components/data/Chart";
import { DashCard, IconTile, Segmented } from "@/components/data/DashCard";
import { OrderStatusGrid } from "@/components/data/OrderStatusGrid";
import type { VendorDashboardData, VendorRange } from "@/lib/data/vendor-dashboard";
import { money } from "@/lib/money";
import type { Tone } from "@/lib/tones";

const RANGE_TABS: { key: VendorRange; label: string }[] = [
  { key: "year", label: "This year" },
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
];

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function EmptyList({ text }: { text: string }) {
  return (
    <div className="mt-4.5 flex flex-col items-center gap-2 rounded-md bg-sunken px-4 py-8 text-center">
      <Inbox aria-hidden className="size-6 text-fg-subtle" strokeWidth={1.7} />
      <p className="max-w-[320px] text-caption text-fg-muted">{text}</p>
    </div>
  );
}

export function VendorDashboard({ data }: { data: VendorDashboardData }) {
  const [period, setPeriod] = useState<"overall" | "today" | "month">("overall");
  const [range, setRange] = useState<VendorRange>("year");
  const e = data.earnings[range];

  const wallet: { label: string; value: number; tone: Tone; icon: LucideIcon }[] = [
    { label: "Pending withdraw", value: data.wallet.pendingWithdraw, tone: "warning", icon: Hourglass },
    { label: "Total commission", value: data.wallet.totalCommission, tone: "iris", icon: BadgePercent },
    { label: "Already withdrawn", value: data.wallet.alreadyWithdrawn, tone: "success", icon: CircleCheck },
    { label: "Delivery charge earned", value: data.wallet.deliveryCharge, tone: "info", icon: Truck },
    { label: "Total tax", value: data.wallet.totalTax, tone: "neutral", icon: Receipt },
    { label: "Total sales (Stripe)", value: data.wallet.totalSales, tone: "saffron", icon: CreditCard },
  ];
  const canWithdraw = data.wallet.withdrawable > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Business analytics */}
      <DashCard
        title="Business Analytics"
        icon={LayoutGrid}
        actions={
          <div className="relative">
            <select
              value={period}
              onChange={(ev) => setPeriod(ev.target.value as typeof period)}
              aria-label="Statistics period"
              className="h-10.5 cursor-pointer appearance-none rounded-md border border-line bg-card pr-10 pl-3.5 text-sm font-semibold text-fg-strong"
            >
              <option value="overall">Overall statistics</option>
              <option value="today">Today</option>
              <option value="month">This month</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" />
          </div>
        }
      >
        <div className="mt-5">
          <OrderStatusGrid counts={data.statusCounts[period]} ordersHref="/vendor/orders" />
        </div>
      </DashCard>

      {/* Vendor wallet */}
      <DashCard title="Vendor Wallet" icon={Wallet} tone="saffron">
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
          <div className="relative flex min-h-59 flex-col justify-between gap-5 overflow-hidden rounded-lg bg-linear-135 from-iris-700 to-iris-900 px-6 py-7 text-on-primary">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,var(--iris-400),transparent_55%)] opacity-35" />
            <div className="relative flex items-center justify-between">
              <span className="text-caption font-semibold text-iris-100">Withdrawable balance</span>
              <span className="grid size-10 place-items-center rounded-md bg-on-primary/15">
                <Wallet aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
            </div>
            <div className="relative">
              <div className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold tracking-[-0.02em] tabular-nums">
                {money(data.wallet.withdrawable)}
              </div>
              <div className="mt-1 text-[0.7rem] text-iris-100">Paid out via Stripe Connect · 2–3 business days</div>
            </div>
            <button
              type="button"
              disabled={!canWithdraw}
              title={canWithdraw ? undefined : "Nothing to withdraw yet"}
              className="relative inline-flex h-11.5 items-center justify-center gap-2 rounded-md bg-accent text-[0.9rem] font-bold text-fg-strong transition-colors duration-(--dur-fast) hover:bg-saffron-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
            >
              <ArrowUpRight aria-hidden className="size-4.5" strokeWidth={2} />
              Withdraw
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3.5 min-[421px]:grid-cols-2">
            {wallet.map((w) => (
              <div
                key={w.label}
                className="flex items-start justify-between gap-3 rounded-lg border border-line p-3.5 transition-shadow duration-(--dur-med) hover:shadow-md sm:px-5 sm:py-4.5"
              >
                <div>
                  <div className="font-display text-[1.2rem] font-extrabold tracking-[-0.01em] text-fg-strong tabular-nums sm:text-[1.4rem]">
                    {money(w.value)}
                  </div>
                  <div className="mt-1 text-caption text-fg-muted">{w.label}</div>
                </div>
                <IconTile icon={w.icon} tone={w.tone} size="lg" />
              </div>
            ))}
          </div>
        </div>
      </DashCard>

      {/* Earning statistics */}
      <DashCard
        title="Earning Statistics"
        icon={ChartLine}
        tone="success"
        actions={<Segmented label="Earning statistics period" options={RANGE_TABS} value={range} onChange={setRange} />}
      >
        <div className="mt-2 mb-3.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-primary" />
            Income <b className="text-fg-strong tabular-nums">{money(sum(e.income))}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-accent" />
            Commission given <b className="text-fg-strong tabular-nums">{money(sum(e.commission))}</b>
          </span>
        </div>
        <LineChart
          className="relative h-60 sm:h-80"
          label="Earning statistics chart"
          format="cents"
          labels={e.labels}
          series={[
            { label: "Income", data: e.income, token: "--color-primary", fill: true },
            { label: "Commission given", data: e.commission, token: "--saffron-400", dashed: true },
          ]}
        />
      </DashCard>

      {/* Lists: filled once the store has products, reviews and deliveries */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-4 sm:gap-6">
        <DashCard title="Most Rated Products" icon={Star} tone="saffron">
          <EmptyList text="Your best-reviewed products appear here once shoppers leave ratings." />
        </DashCard>
        <DashCard title="Top Selling Products" icon={Trophy}>
          <EmptyList text="Your best sellers and their revenue appear here once orders come in." />
        </DashCard>
      </div>
      <DashCard title="Top Delivery Partners" icon={Truck} tone="success">
        <EmptyList text="Couriers who deliver your orders appear here with their ratings." />
      </DashCard>
    </div>
  );
}
