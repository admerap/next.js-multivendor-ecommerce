"use client";

import {
  BadgePercent,
  ChartLine,
  ChevronDown,
  Hourglass,
  LayoutGrid,
  Package,
  PackageOpen,
  Receipt,
  ShoppingCart,
  Star,
  Store,
  Trophy,
  Truck,
  UserRound,
  Users,
  Wallet,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { DashCard, IconTile, Segmented, SubCard } from "@/components/data/DashCard";
import { DoughnutChart, LineChart } from "@/components/data/Chart";
import { OrderStatusGrid } from "@/components/data/OrderStatusGrid";
import type { AdminDashboardData, Range } from "@/lib/data/admin-dashboard";
import { money } from "@/lib/money";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

const RANGE_TABS: { key: Range; label: string }[] = [
  { key: "year", label: "This year" },
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
];

const USER_CAPTION: Record<Range, string> = {
  year: "New users this year",
  month: "New users this month",
  week: "New users this week",
};

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function Legend({ items }: { items: { label: string; dot: string; value: string }[] }) {
  return (
    <div className="mt-1.5 mb-3.5 flex flex-wrap items-center gap-x-4.5 gap-y-1 text-caption text-fg-muted">
      {items.map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", l.dot)} />
          {l.label} <b className="text-fg-strong tabular-nums">{l.value}</b>
        </span>
      ))}
    </div>
  );
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const [baRange, setBaRange] = useState<"year" | "month" | "today">("year");
  const [ordRange, setOrdRange] = useState<Range>("year");
  const [earnRange, setEarnRange] = useState<Range>("year");

  const statuses = data.statusCounts[baRange];
  const totalOrders = sum(Object.values(statuses));
  const o = data.orderStats[ordRange];
  const e = data.earningStats[earnRange];
  const u = data.userOverview[ordRange];
  const users = [
    { label: "Customers", value: u.customers, dot: "bg-primary", token: "--color-primary" },
    { label: "Vendors", value: u.vendors, dot: "bg-accent", token: "--saffron-400" },
    { label: "Delivery men", value: u.deliveryMen, dot: "bg-success-500", token: "--success-500" },
  ];
  const userTotal = sum(users.map((x) => x.value));

  const bigStats: { label: string; value: string; delta: string; up: boolean; tone: Tone; icon: LucideIcon }[] = [
    { label: "Total Orders", value: totalOrders.toLocaleString("en-US"), delta: "No orders yet", up: false, tone: "iris", icon: ShoppingCart },
    {
      label: "Total Stores",
      value: data.totals.stores.toLocaleString("en-US"),
      delta: `+${data.totals.newStoresThisMonth} new this month`,
      up: data.totals.newStoresThisMonth > 0,
      tone: "saffron",
      icon: Store,
    },
    { label: "Total Products", value: data.totals.products.toLocaleString("en-US"), delta: "0 awaiting approval", up: false, tone: "info", icon: Package },
    {
      label: "Total Customers",
      value: data.totals.customers.toLocaleString("en-US"),
      delta: `+${data.totals.newCustomersThisMonth} new this month`,
      up: data.totals.newCustomersThisMonth > 0,
      tone: "success",
      icon: Users,
    },
  ];

  const wallet: { label: string; value: number; tone: Tone; icon: LucideIcon }[] = [
    { label: "Commission earned", value: data.wallet.commission, tone: "iris", icon: BadgePercent },
    { label: "Delivery charge earned", value: data.wallet.deliveryCharge, tone: "info", icon: Truck },
    { label: "Total tax collected", value: data.wallet.tax, tone: "neutral", icon: Receipt },
    { label: "Pending amount", value: data.wallet.pending, tone: "warning", icon: Hourglass },
  ];

  const twoCol = "mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4";

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Business analytics */}
      <DashCard
        title="Business Analytics"
        icon={LayoutGrid}
        actions={
          <div className="relative">
            <select
              value={baRange}
              onChange={(ev) => setBaRange(ev.target.value as typeof baRange)}
              aria-label="Statistics period"
              className="h-10.5 cursor-pointer appearance-none rounded-md border border-line bg-card pr-10 pl-3.5 text-sm font-semibold text-fg-strong"
            >
              <option value="year">This year statistics</option>
              <option value="month">This month statistics</option>
              <option value="today">Today&apos;s statistics</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" />
          </div>
        }
      >
        <div className="mt-5 mb-3.5 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
          {bigStats.map((b) => (
            <div
              key={b.label}
              className="flex min-w-0 items-start justify-between gap-2.5 rounded-lg border border-line p-3.5 transition-shadow duration-(--dur-med) hover:shadow-md sm:p-5"
            >
              <div className="min-w-0">
                <div className="text-caption font-semibold text-fg-muted sm:text-sm">{b.label}</div>
                <div className="mt-1.5 font-display text-[1.3rem] font-extrabold tracking-[-0.01em] text-fg-strong tabular-nums sm:text-[1.75rem]">
                  {b.value}
                </div>
                <div className={cn("mt-1.5 text-[0.7rem] font-semibold", b.up ? "text-success-600" : "text-fg-muted")}>
                  {b.delta}
                </div>
              </div>
              <span className="max-sm:hidden">
                <IconTile icon={b.icon} tone={b.tone} size="lg" />
              </span>
            </div>
          ))}
        </div>
        <OrderStatusGrid counts={statuses} ordersHref="/admin/orders" />
      </DashCard>

      {/* Admin wallet */}
      <DashCard title="Admin Wallet" icon={Wallet} tone="saffron">
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
          <div className="relative flex min-h-50 flex-col justify-between gap-4.5 overflow-hidden rounded-lg bg-linear-135 from-iris-700 to-iris-900 px-6 py-7 text-on-primary">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,var(--iris-400),transparent_55%)] opacity-35" />
            <div className="relative flex items-center justify-between">
              <span className="text-caption font-semibold text-on-primary/80">In-house total earning</span>
              <span className="grid size-10 place-items-center rounded-md bg-on-primary/15">
                <Wallet aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
            </div>
            <div className="relative">
              <div className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold tracking-[-0.02em] tabular-nums">
                {money(data.wallet.inhouseEarning)}
              </div>
              <div className="mt-1 text-[0.7rem] text-on-primary/80">Sundry Official store · settled via Stripe</div>
            </div>
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

      {/* Order statistics + user overview */}
      <div className="grid items-stretch gap-4 sm:gap-6 min-[1101px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <DashCard
          title="Order Statistics"
          icon={ChartLine}
          tone="info"
          actions={<Segmented label="Order statistics period" options={RANGE_TABS} value={ordRange} onChange={setOrdRange} />}
        >
          <Legend
            items={[
              { label: "In-house", dot: "bg-primary", value: `${sum(o.inhouse)} orders` },
              { label: "Vendor", dot: "bg-accent", value: `${sum(o.vendor)} orders` },
            ]}
          />
          <LineChart
            className="relative h-60 sm:h-75"
            label="Order statistics chart"
            format="count"
            labels={o.labels}
            series={[
              { label: "In-house", data: o.inhouse, token: "--color-primary", fill: true },
              { label: "Vendor", data: o.vendor, token: "--saffron-400", dashed: true },
            ]}
          />
        </DashCard>

        <DashCard title="User Overview" icon={PieChart}>
          <div className="mt-5.5 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <div className="relative size-55 max-w-full shrink-0">
              <DoughnutChart
                className="absolute inset-0"
                label="User overview chart"
                labels={users.map((x) => x.label)}
                data={users.map((x) => x.value)}
                tokens={users.map((x) => x.token)}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-[1.6rem] font-extrabold text-fg-strong tabular-nums">
                    {userTotal.toLocaleString("en-US")}
                  </div>
                  <div className="text-caption text-fg-muted">{USER_CAPTION[ordRange]}</div>
                </div>
              </div>
            </div>
            <div className="flex max-w-90 flex-[1_1_220px] flex-col gap-3">
              {users.map((x) => (
                <div key={x.label} className="flex items-center gap-2.5 text-sm text-fg">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", x.dot)} />
                  <span className="flex-1">{x.label}</span>
                  <b className="text-fg-strong tabular-nums">{x.value.toLocaleString("en-US")}</b>
                  <span className="w-11 text-right text-caption text-fg-muted tabular-nums">
                    {userTotal ? `${((x.value / userTotal) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashCard>
      </div>

      {/* Earning statistics */}
      <DashCard
        title="Earning Statistics"
        icon={ChartLine}
        tone="success"
        actions={<Segmented label="Earning statistics period" options={RANGE_TABS} value={earnRange} onChange={setEarnRange} />}
      >
        <Legend
          items={[
            { label: "In-house", dot: "bg-primary", value: money(sum(e.inhouse)) },
            { label: "Vendor", dot: "bg-accent", value: money(sum(e.vendor)) },
            { label: "Commission", dot: "bg-success-500", value: money(sum(e.commission ?? [])) },
          ]}
        />
        <LineChart
          className="relative h-60 sm:h-80"
          label="Earning statistics chart"
          format="cents"
          labels={e.labels}
          series={[
            { label: "In-house", data: e.inhouse, token: "--color-primary", fill: true },
            { label: "Vendor", data: e.vendor, token: "--saffron-400" },
            { label: "Commission", data: e.commission ?? [], token: "--success-500", dashed: true },
          ]}
        />
      </DashCard>

      {/* Lists: filled once orders, products and reviews exist */}
      <DashCard title="Users" icon={Users}>
        <div className={twoCol}>
          <SubCard title="Top Customers" icon={UserRound} tone="iris" href="/admin/customers" empty="Customers with the most orders appear here." />
          <SubCard title="Top Delivery Men" icon={Truck} tone="success" href="#" empty="Delivery men and their completed deliveries appear here." />
        </div>
      </DashCard>

      <DashCard title="Stores" icon={Store} tone="saffron">
        <div className={twoCol}>
          <SubCard title="Most Popular Stores" icon={Trophy} tone="error" href="/admin/vendors" empty="Stores with the most followers appear here." />
          <SubCard title="Top Selling Stores" icon={ShoppingCart} tone="iris" href="/admin/vendors" empty="Stores ranked by revenue appear here once orders come in." />
        </div>
      </DashCard>

      <DashCard
        title="In-house Products"
        icon={PackageOpen}
        tone="info"
        actions={
          <span className="mr-auto rounded-full bg-sunken px-2.5 py-1 text-[0.7rem] font-bold text-fg-muted">
            Sold by Sundry Official
          </span>
        }
      >
        <div className={twoCol}>
          <SubCard title="Most Rated Products" icon={Star} tone="saffron" href="/admin/products" empty="Your best-reviewed in-house products appear here." />
          <SubCard title="Top Selling Products" icon={ShoppingCart} tone="iris" href="/admin/products" empty="Best-selling in-house products appear here." />
        </div>
      </DashCard>

      <DashCard title="Vendor Products" icon={Package}>
        <div className={twoCol}>
          <SubCard title="Most Rated Products" icon={Star} tone="saffron" href="/admin/products" empty="Top-rated products from vendor stores appear here." />
          <SubCard title="Top Selling Products" icon={ShoppingCart} tone="iris" href="/admin/products" empty="Best-selling vendor products appear here." />
        </div>
      </DashCard>
    </div>
  );
}
