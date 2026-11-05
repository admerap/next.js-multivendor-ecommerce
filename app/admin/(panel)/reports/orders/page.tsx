import { CalendarRange, ChartLine, CircleDollarSign, Receipt, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminOrderReportTable } from "@/components/admin/reports/AdminOrderReportTable";
import { PaymentStats } from "@/components/admin/reports/PaymentStats";
import { StackedBarChart } from "@/components/data/Chart";
import { DashCard, EmptyState } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { Legend, ReportFilters, ReportHeading, StatCard, StatSplit } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/access.server";
import { getAdminOrderReport } from "@/lib/admin-reports.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import { ADMIN_ORDER_GROUP_LABEL, ADMIN_ORDER_GROUPS, ADMIN_REPORT_RANGE_LABEL, ADMIN_REPORT_RANGES, adminOrderReportSchema } from "@/lib/validations/admin-report";

export const metadata: Metadata = { title: "Order Report" };

const PATH = "/admin/reports/orders";
const ERROR = { title: "Couldn't load this report", description: "The reporting service didn't respond. Check your connection and try again." };
const RANGES = ADMIN_REPORT_RANGES.map((r) => ({ value: r, label: ADMIN_REPORT_RANGE_LABEL[r] }));

const noOrdersYet = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={ShoppingCart} title="No order data yet" description="Once orders start flowing through Sundry, this report fills in automatically." />
  </section>
);

/**
 * Admin › Report Manage › Order Report (adminorderreport design) — read-only, platform-wide, computed on every
 * request (lib/admin-reports.server). One row per store in each order (the design's Store column and seller
 * filter); seller, range, status, search and page all live in the URL.
 */
export default async function AdminOrderReportPage({ searchParams }: PageProps<"/admin/reports/orders">) {
  await requirePermission("reports");
  const params = adminOrderReportSchema.parse(firstParams(await searchParams));
  const r = await getAdminOrderReport(params); // throws → error.tsx (Retry)
  const label = r.bounds.label;
  const filters = { range: params.range === "year" ? undefined : params.range, store: r.store, status: params.status };
  const storeName = r.store ? r.stores.find((s) => s.id === r.store)?.name : undefined;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Report Manage" }, { label: "Order Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ReportHeading icon={ChartLine} title="Order Report" />
            <p className="mt-1.5 text-[0.9rem] text-fg-muted">Orders, settlements and refunds across every store.</p>
          </div>
        }
        loading={<ReportSkeleton />}
        empty={noOrdersYet}
        error={ERROR}
      >
        {!r.hasAnyOrders ? (
          noOrdersYet
        ) : (
          <div className="flex flex-col gap-5">
            <ReportFilters
              action={PATH}
              range={params.range}
              ranges={RANGES}
              selects={[
                { name: "store", label: "Seller", value: r.store ?? "", options: [{ value: "", label: "All stores" }, ...r.stores.map((s) => ({ value: s.id, label: s.name }))] },
                { name: "status", label: "Order status", value: params.status ?? "", options: [{ value: "", label: "All statuses" }, ...ADMIN_ORDER_GROUPS.map((g) => ({ value: g, label: ADMIN_ORDER_GROUP_LABEL[g] }))] },
              ]}
            />

            {!r.hasData ? (
              <section className="rounded-lg bg-card shadow-sm">
                <EmptyState
                  bare
                  icon={CalendarRange}
                  title="No orders in this range"
                  description={storeName ? `${storeName} has no orders ${label}. Try a longer date range or all stores.` : `No store had an order ${label}. Try a longer date range.`}
                >
                  <Button asChild variant="secondary">
                    <Link href={PATH}>
                      <CalendarRange aria-hidden />
                      Show all stores, this year
                    </Link>
                  </Button>
                </EmptyState>
              </section>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)_minmax(250px,1fr)]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <StatCard icon={ShoppingCart} tone="iris" value={r.counts.total.toLocaleString("en-US")} label={`Total orders ${label}`}>
                      <StatSplit
                        items={[
                          { label: "Canceled", value: r.counts.canceled, tone: "error", hint: "Canceled, returned or failed to deliver" },
                          { label: "Ongoing", value: r.counts.ongoing, tone: "info", hint: "Pending, confirmed, packaging or out for delivery" },
                          { label: "Completed", value: r.counts.completed, tone: "success", hint: "Delivered to the customer" },
                        ]}
                      />
                    </StatCard>
                    <StatCard icon={Receipt} tone="info" value={money(r.amounts.sales)} label="Total order amount">
                      <StatSplit
                        items={[
                          { label: "Orders", value: r.amounts.orders, tone: "iris", hint: "Customer orders with at least one part that wasn't canceled, returned or failed" },
                          { label: "Avg. order", value: money(r.amounts.avgOrder), tone: "success", hint: "Total order amount ÷ orders" },
                          { label: "Lost", value: money(r.amounts.lost), tone: "error", hint: "Canceled, returned or failed — not part of the total" },
                        ]}
                      />
                    </StatCard>
                    <StatCard icon={CircleDollarSign} tone="success" value={money(r.settledAmount)} label="Already settled">
                      <p className="mt-3 border-t border-line pt-3 text-caption text-fg-muted">
                        Due amount <b className="text-warning-600 tabular-nums">{money(r.dueAmount)}</b> — still to collect on orders on their way
                      </p>
                    </StatCard>
                  </div>

                  <DashCard title="Order Statistics" icon={ChartLine} subtitle={`Settled vs. due order value, ${label}`} className="lg:order-last lg:col-span-2 xl:order-0 xl:col-span-1">
                    <div className="mt-3">
                      <Legend
                        items={[
                          { label: "Settled", value: money(r.settledAmount), dot: "bg-primary" },
                          { label: "Due", value: money(r.dueAmount), dot: "bg-saffron-400" },
                        ]}
                      />
                    </div>
                    <StackedBarChart
                      className="relative mt-4 h-64 sm:h-72"
                      label="Settled vs due order value chart"
                      format="cents"
                      labels={r.bounds.buckets.map((x) => x.label)}
                      series={[
                        { label: "Settled", data: r.chart.settled, token: "--color-primary" },
                        { label: "Due", data: r.chart.due, token: "--saffron-400" },
                      ]}
                    />
                  </DashCard>

                  <PaymentStats payments={r.payments} subtitle="How customers paid" />
                </div>

                <section aria-labelledby="order-table" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 id="order-table" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                      Total Orders
                      <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.table.total}</span>
                    </h2>
                    <SearchForm action={PATH} q={params.q} placeholder="Search by order ID or store" keep={filters} />
                    <ExportMenu href={withQuery("/api/admin/reports/orders/export", { ...filters, q: params.q || undefined })} />
                  </div>
                  <div className="border-t border-line">
                    {r.table.rows.length > 0 ? (
                      <>
                        <AdminOrderReportTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} />
                        <Pagination
                          page={r.table.page}
                          pageCount={r.table.pageCount}
                          total={r.table.total}
                          pageSize={r.table.pageSize}
                          noun="orders"
                          params={{ ...filters, q: params.q || undefined, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                        />
                      </>
                    ) : (
                      <NoMatches noun="orders" q={params.q} />
                    )}
                  </div>
                </section>
                <p className="text-caption text-fg-muted">
                  Each row is one store&apos;s part of an order, so an order with several stores appears once per store. Settled = paid (cash collected on delivery); due = still to collect.
                </p>
              </>
            )}
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
