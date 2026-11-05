import { BarChart3, Boxes, Package, PackagePlus, Tag, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "@/components/data/Chart";
import { EmptyState, IconTile } from "@/components/data/DashCard";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { ProductReportTable } from "@/components/vendor/reports/ProductReportTable";
import { ExportMenu } from "@/components/data/ExportMenu";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportFilters, ReportHeading, ReportTabs, StatSplit } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { requireArea } from "@/lib/auth-guard";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { productReportSchema, REPORT_RANGE_LABEL, type StockFilter } from "@/lib/validations/vendor-report";
import { getProductReport } from "@/lib/vendor-reports.server";

export const metadata: Metadata = { title: "Product Report" };

const PATH = "/vendor/reports/products";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." };
const STOCK_CHIPS: { value: StockFilter | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

const noProducts = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={Package} title="No product data yet" description="Add and sell products to see sales, stock and ratings for each one.">
      <Button asChild>
        <Link href="/vendor/products" className="!text-on-primary">
          <Package aria-hidden />
          Go to Product List
        </Link>
      </Button>
    </EmptyState>
  </section>
);

/**
 * Seller Center › Report Manage › Product Report (vendorproductreport design) — read-only, computed on
 * every request from this store's products and orders. Tab, range, stock level, search and page are
 * all in the URL.
 */
export default async function ProductReportPage({ searchParams }: PageProps<"/vendor/reports/products">) {
  const user = await requireArea("VENDOR");
  const params = productReportSchema.parse(firstParams(await searchParams));
  const r = await getProductReport(user.vendorId!, params); // throws → error.tsx (Retry)
  const rangeLabel = REPORT_RANGE_LABEL[params.range];
  const range = params.range === "year" ? undefined : params.range;
  const tab = params.tab === "all" ? undefined : params.tab;
  const keep = { range, tab, stock: params.tab === "stock" ? params.stock : undefined };

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Report Manage" }, { label: "Product Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ReportHeading icon={BarChart3} title="Product Report" />}
        loading={<ReportSkeleton />}
        empty={noProducts}
        error={ERROR}
      >
        {r.totalProducts === 0 ? (
          noProducts
        ) : (
          <div className="flex flex-col gap-5">
            <ReportTabs
              tabs={[
                { label: "All Products", href: withQuery(PATH, { range }), current: params.tab === "all" },
                { label: "Products Stock", href: withQuery(PATH, { range, tab: "stock" }), current: params.tab === "stock" },
              ]}
            />

            <ReportFilters action={PATH} range={params.range} keep={{ tab }} />

            {params.tab === "all" && (
              <section aria-label="Product summary" className="min-w-0 rounded-lg bg-card p-4 shadow-sm sm:p-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="min-w-0 rounded-lg bg-sunken p-4">
                    <div className="flex items-center gap-3.5 rounded-md bg-card px-4 py-3.5">
                      <IconTile icon={Boxes} tone="saffron" size="lg" />
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{r.totalProducts}</div>
                        <div className="text-caption text-fg-muted">Total products</div>
                      </div>
                    </div>
                    <StatSplit
                      items={[
                        { label: "Rejected", value: r.byApproval.rejected, tone: "error", hint: "Denied by the Sundry team" },
                        { label: "Pending", value: r.byApproval.pending, tone: "info", hint: "Waiting for review" },
                        { label: "Active", value: r.byApproval.approved, tone: "success", hint: "Approved" },
                      ]}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-success-50 p-4.5">
                      <span className="grid size-13 shrink-0 place-items-center rounded-full bg-card text-success-600">
                        <TrendingUp aria-hidden className="size-6" strokeWidth={1.9} />
                      </span>
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{r.unitsSold.toLocaleString("en-US")}</div>
                        <div className="text-caption text-fg-muted">
                          Total product sale · <b className="text-fg-strong tabular-nums">{money(r.totalSales)}</b>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-saffron-50 p-4.5">
                      <span className="grid size-13 shrink-0 place-items-center rounded-full bg-card text-saffron-600">
                        <Tag aria-hidden className="size-6" strokeWidth={1.9} />
                      </span>
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{money(r.discountGiven)}</div>
                        <div className="text-caption text-fg-muted" title="Coupon discounts your store funded. Product discounts aren't recorded on past orders.">
                          Total discount given (coupons)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-fg-strong">Product Statistics</h2>
                  <div className="text-right">
                    <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{r.unitsSold.toLocaleString("en-US")} units</div>
                    <div className="text-caption text-fg-muted">Sold · {rangeLabel}</div>
                  </div>
                </div>
                {r.unitsSold === 0 && <p className="mt-2 text-sm text-fg-muted">No units sold {rangeLabel.toLowerCase()} yet.</p>}
                <LineChart
                  className="relative mt-3 h-64 sm:h-72"
                  label="Units sold chart"
                  format="count"
                  labels={r.chart.labels}
                  series={[{ label: "Units sold", data: r.chart.units, token: "--color-primary", fill: true }]}
                />
              </section>
            )}

            <section aria-label={params.tab === "all" ? "Products" : "Products stock"} className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <SearchForm action={PATH} q={params.q} placeholder="Search product name or SKU" keep={keep} />
                {params.tab === "stock" && (
                  <div role="group" aria-label="Stock level" className="flex flex-wrap gap-1.5">
                    {STOCK_CHIPS.map((c) => (
                      <Link
                        key={c.label}
                        href={withQuery(PATH, { range, tab: "stock", stock: c.value, q: params.q || undefined })}
                        aria-current={params.stock === c.value ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors duration-(--dur-fast)",
                          params.stock === c.value ? "border-primary bg-iris-50 !text-primary" : "border-line !text-fg-muted hover:!text-primary",
                        )}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
                <ExportMenu href={withQuery("/api/vendor/reports/products/export", { ...keep, q: params.q || undefined })} />
              </div>
              <div className="border-t border-line">
                {r.table.rows.length > 0 ? (
                  <>
                    <ProductReportTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} tab={params.tab} />
                    <Pagination
                      page={r.table.page}
                      pageCount={r.table.pageCount}
                      total={r.table.total}
                      pageSize={r.table.pageSize}
                      noun="products"
                      params={{ ...keep, q: params.q || undefined, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                    />
                  </>
                ) : params.q ? (
                  <NoMatches noun="products" q={params.q} />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                    <PackagePlus aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                    <p className="text-sm text-fg-muted">No product found at this stock level.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
