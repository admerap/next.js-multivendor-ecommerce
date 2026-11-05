import { CalendarRange, ChartLine, CircleDollarSign, Package, ShoppingCart, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DoughnutChart, LineChart } from "@/components/data/Chart";
import { DashCard, EmptyState } from "@/components/data/DashCard";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { OrderReportTable } from "@/components/vendor/reports/OrderReportTable";
import { ExportMenu } from "@/components/data/ExportMenu";
import { SearchForm } from "@/components/data/SearchForm";
import { Legend, paymentDonut, ReportFilters, ReportHeading, StatCard, StatSplit } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import { orderReportSchema, REPORT_RANGE_LABEL } from "@/lib/validations/vendor-report";
import { getOrderReport } from "@/lib/vendor-reports.server";

export const metadata: Metadata = { title: "Order Report" };

const PATH = "/vendor/reports/orders";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." };
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Delivered" },
  { value: "ongoing", label: "Ongoing" },
  { value: "canceled", label: "Canceled" },
];

const goToProducts = (
  <Button asChild>
    <Link href="/vendor/products" className="!text-on-primary">
      <Package aria-hidden />
      Go to Product List
    </Link>
  </Button>
);
const noOrdersYet = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={ShoppingCart} title="No orders yet" description="Once buyers order from your store, order totals, discounts and commission appear here.">
      {goToProducts}
    </EmptyState>
  </section>
);

/**
 * Seller Center › Report Manage › Order Report (vendororderreport design) — read-only, computed from this
 * store's orders on every request. Range, status, search and page all live in the URL.
 */
export default async function OrderReportPage({ searchParams }: PageProps<"/vendor/reports/orders">) {
  const user = await requireArea("VENDOR");
  const params = orderReportSchema.parse(firstParams(await searchParams));
  const r = await getOrderReport(user.vendorId!, params); // throws → error.tsx (Retry)
  const rangeLabel = REPORT_RANGE_LABEL[params.range];
  const filters = { range: params.range === "year" ? undefined : params.range, status: params.status };
  const exportHref = withQuery("/api/vendor/reports/orders/export", { ...filters, q: params.q || undefined });
  const pay = paymentDonut(r.payments);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Report Manage" }, { label: "Order Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ReportHeading icon={ChartLine} title="Order Report" />}
        loading={<ReportSkeleton />}
        empty={noOrdersYet}
        error={ERROR}
      >
        {!r.hasAnyOrders ? (
          noOrdersYet
        ) : (
          <div className="flex flex-col gap-5">
            <ReportFilters action={PATH} range={params.range} selects={[{ name: "status", label: "Order status", value: params.status ?? "", options: STATUS_OPTIONS }]} />

            {r.totalOrders === 0 ? (
              <section className="rounded-lg bg-card shadow-sm">
                <EmptyState bare icon={CalendarRange} title="No orders in this range" description={`Your store has no orders for ${rangeLabel.toLowerCase()}. Try a longer date range.`}>
                  {params.range !== "year" && (
                    <Button asChild variant="secondary">
                      <Link href={PATH}>
                        <CalendarRange aria-hidden />
                        Show this year
                      </Link>
                    </Button>
                  )}
                </EmptyState>
              </section>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)_minmax(250px,1fr)]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <StatCard icon={ShoppingCart} tone="iris" value={r.totalOrders.toLocaleString("en-US")} label="Total orders">
                      <StatSplit
                        items={[
                          { label: "Canceled", value: r.groups.canceled, tone: "error", hint: "Canceled, returned or not delivered" },
                          { label: "Ongoing", value: r.groups.ongoing, tone: "info", hint: "Pending, confirmed, packaging or out for delivery" },
                          { label: "Completed", value: r.groups.completed, tone: "success", hint: "Delivered to the customer" },
                        ]}
                      />
                    </StatCard>
                    <StatCard icon={CircleDollarSign} tone="success" value={money(r.totalAmount)} label="Total order amount">
                      <p className="mt-3 border-t border-line pt-3 text-caption text-fg-muted">
                        Average order <b className="text-fg-strong tabular-nums">{money(r.avgOrderValue)}</b>
                      </p>
                    </StatCard>
                  </div>

                  <DashCard
                    title="Order Statistics"
                    icon={ChartLine}
                    className="lg:order-last lg:col-span-2 xl:order-none xl:col-span-1"
                    actions={
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money(r.totalAmount)}</div>
                        <div className="text-caption text-fg-muted">{rangeLabel}</div>
                      </div>
                    }
                  >
                    <LineChart
                      className="relative mt-4 h-64 sm:h-72"
                      label="Order statistics chart"
                      format="cents"
                      labels={r.chart.labels}
                      series={[{ label: "Order amount", data: r.chart.amount, token: "--color-primary", fill: true }]}
                    />
                  </DashCard>

                  <DashCard title="Payment Statistics" icon={Wallet} tone="success">
                    <div className="relative mx-auto mt-5 size-48">
                      <DoughnutChart className="absolute inset-0" label="Payment split chart" format="cents" labels={pay.map((p) => p.label)} data={pay.map((p) => p.value)} tokens={pay.map((p) => p.token)} />
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money(r.payments.paid)}</div>
                          <div className="text-caption text-fg-muted">Completed payments</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Legend items={pay.map((p) => ({ label: p.legend, value: money(p.value), dot: p.dot }))} />
                    </div>
                  </DashCard>
                </div>

                <section aria-labelledby="order-table" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 id="order-table" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                      Total Orders
                      <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.table.total}</span>
                    </h2>
                    <SearchForm action={PATH} q={params.q} placeholder="Search by order ID" keep={filters} />
                    <ExportMenu href={exportHref} />
                  </div>
                  <div className="border-t border-line">
                    {r.table.rows.length > 0 ? (
                      <>
                        <OrderReportTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} />
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
              </>
            )}
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
