import { ArrowDownToLine, BadgePercent, CalendarRange, ChartLine, HandCoins, Hourglass, Package, Store, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EarningBucketTable, VendorEarningTable } from "@/components/admin/reports/EarningsTables";
import { PaymentStats } from "@/components/admin/reports/PaymentStats";
import { LineChart, StackedBarChart } from "@/components/data/Chart";
import { DashCard, EmptyState, IconTile } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { Legend, NotRecorded, ReportFilters, ReportHeading, ReportTabs, StatCard, StatSplit } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/access.server";
import { getAdminEarnings } from "@/lib/admin-reports.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import { ADMIN_REPORT_RANGE_LABEL, ADMIN_REPORT_RANGES, adminEarningsSchema } from "@/lib/validations/admin-report";

export const metadata: Metadata = { title: "Earning Reports" };

const PATH = "/admin/reports/earnings";
const ERROR = { title: "Couldn't load this report", description: "The reporting service didn't respond. Check your connection and try again." };
const RANGES = ADMIN_REPORT_RANGES.map((r) => ({ value: r, label: ADMIN_REPORT_RANGE_LABEL[r] }));
const pct = (bp: number) => `${(bp / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

const noEarnings = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={Wallet} title="No earning data yet" description="Once orders start flowing through Sundry, this report fills in automatically." />
  </section>
);

/**
 * Admin › Report Manage › Earning Reports (adminearningreports design) — read-only, platform-wide, computed on
 * every request (lib/admin-reports.server). Admin Earning = what Sundry keeps (commission charged on delivery
 * + delivery charges); Vendor Earning = what every store takes home. Commission is the amount fixed on each
 * order when it was placed. Payouts / Stripe / in-house aren't built: shown as "—" or a labelled TODO.
 */
export default async function AdminEarningsReportPage({ searchParams }: PageProps<"/admin/reports/earnings">) {
  await requirePermission("reports");
  const params = adminEarningsSchema.parse(firstParams(await searchParams));
  const r = await getAdminEarnings(params); // throws → error.tsx (Retry)
  const vendorTab = params.tab === "vendor";
  const range = params.range === "year" ? undefined : params.range;
  const tab = vendorTab ? "vendor" : undefined;
  const label = r.bounds.label;
  const rates = r.commissionRates.length ? r.commissionRates : [r.defaultCommissionRate];
  const rateText = rates.map(pct).join(" / ");

  const legend = vendorTab
    ? [
        { label: "Net earning", value: money(r.vendor.net), dot: "bg-primary" },
        { label: "Commission paid", value: money(r.vendor.commission), dot: "bg-saffron-400" },
      ]
    : [
        { label: "Commission", value: money(r.admin.commission), dot: "bg-primary" },
        { label: "Shipping", value: money(r.admin.shipping), dot: "bg-success-500" },
        { label: "In-house", value: <NotRecorded reason="No in-house Sundry Official store yet" />, dot: "bg-saffron-400" },
      ];

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Report Manage" }, { label: "Earning Reports" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ReportHeading icon={Wallet} title="Earning Reports" />
            <p className="mt-1.5 text-[0.9rem] text-fg-muted">What Sundry earns from commission, in-house sales and shipping — and what stores take home.</p>
          </div>
        }
        loading={<ReportSkeleton />}
        empty={noEarnings}
        error={ERROR}
      >
        <div className="flex flex-col gap-5">
          <ReportTabs
            tabs={[
              { label: "Admin Earning", href: withQuery(PATH, { range }), current: !vendorTab },
              { label: "Vendor Earning", href: withQuery(PATH, { range, tab: "vendor" }), current: vendorTab },
            ]}
          />

          <ReportFilters action={PATH} range={params.range} ranges={RANGES} keep={{ tab }} />

          {!r.hasData ? (
            params.range === "year" ? (
              noEarnings
            ) : (
              <section className="rounded-lg bg-card shadow-sm">
                <EmptyState bare icon={CalendarRange} title="No earnings in this range" description={`Nothing was delivered, paid or ordered ${label}. Try a longer date range.`}>
                  <Button asChild variant="secondary">
                    <Link href={withQuery(PATH, { tab })}>
                      <CalendarRange aria-hidden />
                      Show this year
                    </Link>
                  </Button>
                </EmptyState>
              </section>
            )
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <StatCard
                  icon={vendorTab ? Store : Wallet}
                  tone="iris"
                  value={money(vendorTab ? r.vendor.net : r.admin.total)}
                  label={vendorTab ? "Total vendor net earning" : "Total admin earning"}
                  className="md:col-span-2 xl:col-span-1"
                >
                  <StatSplit
                    items={
                      vendorTab
                        ? [
                            { label: "Gross sales", value: money(r.vendor.gross), tone: "iris", hint: "Items after the stores' coupons, on delivered orders" },
                            { label: "Commission paid", value: money(r.vendor.commission), tone: "saffron" },
                            { label: "Withdrawn", value: <NotRecorded reason="Payouts arrive with Stripe Connect" />, tone: "neutral" },
                          ]
                        : [
                            { label: "Commission", value: money(r.admin.commission), tone: "iris", hint: `${rateText} of each delivered order's items after coupons` },
                            { label: "In-house", value: <NotRecorded reason="No in-house Sundry Official store yet" />, tone: "neutral" },
                            { label: "Shipping", value: money(r.admin.shipping), tone: "success", hint: "Sundry delivers: delivery charges on delivered orders" },
                          ]
                    }
                  />
                  {/* Orders still on their way: not earned yet, so not in the total — shown as an estimate. */}
                  <p className="mt-3 flex items-start gap-2 text-caption text-fg-muted">
                    <Hourglass aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning-600" />
                    {r.admin.pending.orders === 0 ? (
                      <span>Nothing pending — no order placed {label} is still on its way.</span>
                    ) : vendorTab ? (
                      <span>
                        Pending (est.): <b className="text-fg-strong tabular-nums">{money(r.vendor.pending.net)}</b> net on {r.vendor.pending.orders} {r.vendor.pending.orders === 1 ? "order" : "orders"} still on the way — earned once delivered.
                      </span>
                    ) : (
                      <span>
                        Pending (est.): <b className="text-fg-strong tabular-nums">{money(r.admin.pending.commission)}</b> commission + <b className="text-fg-strong tabular-nums">{money(r.admin.pending.shipping)}</b> delivery on {r.admin.pending.orders}{" "}
                        {r.admin.pending.orders === 1 ? "order" : "orders"} still on the way — earned once delivered.
                      </span>
                    )}
                  </p>
                </StatCard>
                <StatCard
                  icon={Package}
                  tone="saffron"
                  value={vendorTab ? r.vendor.vendorProducts.toLocaleString("en-US") : <NotRecorded reason="No in-house Sundry Official store yet" />}
                  label={vendorTab ? "Total vendor products" : "Total in-house products"}
                />
                <StatCard icon={Store} tone="info" value={r.shops.toLocaleString("en-US")} label="Total shops" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <DashCard title="Earning Statistics" icon={ChartLine} tone="success" subtitle={vendorTab ? `Vendor net earning vs. commission paid, ${label} · by delivery date` : `Admin earning by source, ${label} · by delivery date`}>
                  <div className="mt-3">
                    <Legend items={legend} />
                  </div>
                  {vendorTab ? (
                    <LineChart
                      className="relative mt-4 h-64 sm:h-72"
                      label="Vendor earning chart"
                      format="cents"
                      labels={r.bounds.buckets.map((b) => b.label)}
                      series={[
                        { label: "Net earning", data: r.vendor.chart.net, token: "--color-primary", fill: true },
                        { label: "Commission paid", data: r.vendor.chart.commission, token: "--saffron-400", dashed: true },
                      ]}
                    />
                  ) : (
                    <StackedBarChart
                      className="relative mt-4 h-64 sm:h-72"
                      label="Admin earning by source chart"
                      format="cents"
                      labels={r.admin.rows.map((x) => x.label)}
                      series={[
                        { label: "Commission", data: r.admin.rows.map((x) => x.commission), token: "--color-primary" },
                        { label: "Shipping", data: r.admin.rows.map((x) => x.shipping), token: "--success-500" },
                      ]}
                    />
                  )}
                </DashCard>

                <PaymentStats payments={r.payments} subtitle={`Payments received, ${label}`} />
              </div>

              {vendorTab ? (
                <section aria-labelledby="vendor-earnings" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 id="vendor-earnings" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                      Vendor earnings
                      <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.vendor.rows.total}</span>
                    </h2>
                    <SearchForm action={PATH} q={params.q} placeholder="Search by store name" keep={{ range, tab }} />
                    <ExportMenu href={withQuery("/api/admin/reports/earnings/export", { range, tab, q: params.q || undefined })} />
                  </div>
                  <div className="border-t border-line">
                    {r.vendor.rows.rows.length > 0 ? (
                      <>
                        <VendorEarningTable rows={r.vendor.rows.rows} offset={(r.vendor.rows.page - 1) * r.vendor.rows.pageSize} />
                        <Pagination
                          page={r.vendor.rows.page}
                          pageCount={r.vendor.rows.pageCount}
                          total={r.vendor.rows.total}
                          pageSize={r.vendor.rows.pageSize}
                          noun="stores"
                          params={{ range, tab, q: params.q || undefined, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                        />
                      </>
                    ) : params.q ? (
                      <NoMatches noun="stores" q={params.q} />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                        <Store aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                        <p className="text-sm text-fg-muted">No store has a delivered order {label} yet — earnings count once an order is delivered.</p>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <section aria-labelledby="admin-earnings" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 id="admin-earnings" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                      Total earnings
                      <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.admin.rows.length}</span>
                    </h2>
                    <ExportMenu href={withQuery("/api/admin/reports/earnings/export", { range })} />
                  </div>
                  <div className="border-t border-line">
                    <EarningBucketTable rows={r.admin.rows} total={r.admin.total} />
                  </div>
                </section>
              )}

              <p className="flex items-start gap-2 text-caption text-fg-muted">
                <BadgePercent aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Commission is {rateText} of each store&apos;s items after its coupon, fixed on the order when it was placed and charged once it&apos;s delivered — so earnings
                count on the delivery date. Canceled, returned and failed orders pay none. Tax is collected for the authorities and isn&apos;t part of Sundry&apos;s earning.
                Payment Statistics counts payments on the day they were collected.
              </p>
            </>
          )}

          {vendorTab && (
            // Scope honesty: payouts don't exist yet (COD only; Stripe Connect later). No rows are made up.
            <section aria-labelledby="payouts" className="rounded-lg border border-dashed border-line-strong bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <IconTile icon={HandCoins} tone="neutral" size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 id="payouts" className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-fg-strong">
                    Vendor payouts &amp; withdrawals
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 font-sans text-caption font-bold tracking-[0.04em] text-fg-muted uppercase">Coming with Stripe</span>
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                    Orders are paid cash on delivery today, collected by Sundry&apos;s couriers, so each store&apos;s balance is what Sundry owes it. Withdrawals, transfers and their status will be listed here once Stripe Connect payouts are set up — nothing is shown until then.
                  </p>
                </div>
                <ArrowDownToLine aria-hidden className="size-5 text-fg-subtle" />
              </div>
            </section>
          )}
        </div>
      </PreviewStateFrame>
    </>
  );
}
