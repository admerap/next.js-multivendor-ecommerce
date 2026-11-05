import { BarChart3, Boxes, Heart, Package, Shapes, Store, Tag, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminProductTable, WishlistTable } from "@/components/admin/reports/AdminProductReportTables";
import { SalesBreakdown } from "@/components/admin/reports/SalesBreakdown";
import { LineChart } from "@/components/data/Chart";
import { EmptyState, IconTile } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportFilters, ReportHeading, ReportTabs } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requirePermission } from "@/lib/access.server";
import { getAdminProductReport } from "@/lib/admin-reports.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import { toneClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { ADMIN_REPORT_RANGE_LABEL, ADMIN_REPORT_RANGES, adminProductReportSchema, type ProductStatusFilter } from "@/lib/validations/admin-report";

export const metadata: Metadata = { title: "Product Report" };

const PATH = "/admin/reports/products";
const ERROR = { title: "Couldn't load this report", description: "The reporting service didn't respond. Check your connection and try again." };
const RANGES = ADMIN_REPORT_RANGES.map((r) => ({ value: r, label: ADMIN_REPORT_RANGE_LABEL[r] }));
/** Status tiles (design order), labelled like everywhere else: REJECTED → Denied. */
const STATUS_TILES: { key: ProductStatusFilter; label: string; tone: Tone; hint: string }[] = [
  { key: "denied", label: "Denied", tone: "error", hint: "Denied by the Sundry team" },
  { key: "pending", label: "Pending", tone: "warning", hint: "Waiting for review" },
  { key: "approved", label: "Approved", tone: "success", hint: "Approved — shown on the storefront when switched on" },
];

const noProducts = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={Package} title="No product data yet" description="Once stores list products on Sundry, this report fills in automatically." />
  </section>
);

/**
 * Admin › Report Manage › Product Report (adminproductreport design) — read-only, platform-wide catalog
 * performance computed on every request (lib/admin-reports.server). Tabs: All Products · Product Stock (its
 * own page) · Wish Listed Products. Seller, range, status tile, search and page all live in the URL.
 */
export default async function AdminProductReportPage({ searchParams }: PageProps<"/admin/reports/products">) {
  await requirePermission("reports");
  const params = adminProductReportSchema.parse(firstParams(await searchParams));
  const r = await getAdminProductReport(params); // throws → error.tsx (Retry)
  const wishlist = params.tab === "wishlist";
  const range = params.range === "year" ? undefined : params.range;
  const tab = wishlist ? "wishlist" : undefined;
  const base = { range, store: r.store, tab };
  const filters = { ...base, status: wishlist ? undefined : params.status };
  const label = r.bounds.label;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Report Manage" }, { label: "Product Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ReportHeading icon={BarChart3} title="Product Report" />
            <p className="mt-1.5 text-[0.9rem] text-fg-muted">Catalog performance across every store, with sales, stock and wishlists.</p>
          </div>
        }
        loading={<ReportSkeleton />}
        empty={noProducts}
        error={ERROR}
      >
        {!r.hasData && !r.store ? (
          noProducts
        ) : (
          <div className="flex flex-col gap-5">
            <ReportTabs
              tabs={[
                { label: "All Products", href: withQuery(PATH, { range, store: r.store }), current: !wishlist },
                { label: "Product Stock", href: withQuery("/admin/reports/stock", { store: r.store }), current: false },
                { label: "Wish Listed Products", href: withQuery(PATH, { range, store: r.store, tab: "wishlist" }), current: wishlist },
              ]}
            />

            <ReportFilters
              action={PATH}
              range={params.range}
              ranges={RANGES}
              keep={{ tab }}
              selects={[{ name: "store", label: "Seller", value: r.store ?? "", options: [{ value: "", label: "All stores" }, ...r.stores.map((s) => ({ value: s.id, label: s.name }))] }]}
            />

            {!wishlist && (
              <section aria-label="Product summary" className="min-w-0 rounded-lg bg-card p-4 shadow-sm sm:p-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="min-w-0 rounded-lg bg-sunken p-4">
                    <div className="flex items-center gap-3.5 rounded-md bg-card px-4 py-3.5">
                      <IconTile icon={Boxes} tone="saffron" size="lg" />
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{r.totalProducts.toLocaleString("en-US")}</div>
                        <div className="text-caption text-fg-muted">Total products</div>
                      </div>
                    </div>
                    {/* Status tiles filter the table (design): tap again to show all. */}
                    <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                      {STATUS_TILES.map((t) => {
                        const on = params.status === t.key;
                        return (
                          <li key={t.key}>
                            <Link
                              href={withQuery(PATH, { ...base, status: on ? undefined : t.key })}
                              aria-current={on ? "true" : undefined}
                              title={t.hint}
                              className={cn(
                                "flex min-h-11 flex-col-reverse rounded-md px-1 py-2.5 text-center transition-colors duration-(--dur-fast)",
                                on ? "bg-card shadow-sm ring-2 ring-primary" : "bg-card/60 hover:bg-card",
                              )}
                            >
                              <span className="text-[0.72rem] leading-tight text-fg-muted">{t.label}</span>
                              <span className={cn("font-display text-lg font-extrabold tabular-nums", toneClasses[t.tone].fg)}>{r.byApproval[t.key]}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-success-50 p-4.5">
                      <span className="grid size-13 shrink-0 place-items-center rounded-full bg-card text-success-600">
                        <TrendingUp aria-hidden className="size-6" strokeWidth={1.9} />
                      </span>
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{r.unitsSold.toLocaleString("en-US")}</div>
                        <div className="text-caption text-fg-muted">Total product sale (units), {label}</div>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-saffron-50 p-4.5">
                      <span className="grid size-13 shrink-0 place-items-center rounded-full bg-card text-saffron-600">
                        <Tag aria-hidden className="size-6" strokeWidth={1.9} />
                      </span>
                      <div>
                        <div className="font-display text-[1.6rem] leading-tight font-extrabold text-fg-strong tabular-nums">{money(r.discountGiven)}</div>
                        <div className="text-caption text-fg-muted" title="Store coupons on the items sold. Product discounts aren't recorded on orders.">
                          Total discount given (coupons)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-fg-strong">Product Statistics</h2>
                    <p className="mt-1 text-caption text-fg-muted">Units sold, {label}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{r.unitsSold.toLocaleString("en-US")} units</div>
                    <div className="text-caption text-fg-muted">{money(r.chart.revenue.reduce((a, b) => a + b, 0))} sold</div>
                  </div>
                </div>
                {r.unitsSold === 0 && <p className="mt-2 text-sm text-fg-muted">No units sold {label} — try a longer date range.</p>}
                <LineChart
                  className="relative mt-3 h-64 sm:h-72"
                  label="Units sold chart"
                  format="count"
                  labels={r.bounds.buckets.map((b) => b.label)}
                  series={[{ label: "Units sold", data: r.chart.units, token: "--color-primary", fill: true }]}
                />
              </section>
            )}

            {!wishlist && (
              <div className="grid gap-4 lg:grid-cols-2">
                <SalesBreakdown title="Sales by category" subtitle={`Amount sold ${label}, best first`} icon={Shapes} tone="info" groups={r.breakdown.categories} />
                <SalesBreakdown
                  title="Sales by store"
                  subtitle={r.store ? "Filtered to one store — choose All stores to compare" : `Amount sold ${label}, best first · tap a store to filter`}
                  icon={Store}
                  tone="saffron"
                  groups={r.breakdown.stores}
                  href={r.store ? undefined : (g) => withQuery(PATH, { range, store: g.id })}
                />
              </div>
            )}

            <section aria-labelledby="product-table" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="product-table" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                  {wishlist ? "Wish listed products" : "Products"}
                  <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.table.total}</span>
                </h2>
                <SearchForm action={PATH} q={params.q} placeholder="Search by product or store" keep={filters} />
                <ExportMenu href={withQuery("/api/admin/reports/products/export", { ...filters, q: params.q || undefined })} />
              </div>
              {params.status && !wishlist && (
                <p className="border-t border-line px-4 py-2.5 text-sm text-fg-muted sm:px-6">
                  Showing <b className="text-fg-strong">{STATUS_TILES.find((t) => t.key === params.status)!.label.toLowerCase()}</b> products ·{" "}
                  <Link href={withQuery(PATH, { ...base, q: params.q || undefined })} className="inline-flex min-h-11 items-center font-semibold !text-primary hover:underline">
                    Show all
                  </Link>
                </p>
              )}
              <div className="border-t border-line">
                {r.table.rows.length > 0 ? (
                  <>
                    {wishlist ? <WishlistTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} /> : <AdminProductTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} />}
                    <Pagination
                      page={r.table.page}
                      pageCount={r.table.pageCount}
                      total={r.table.total}
                      pageSize={r.table.pageSize}
                      noun="products"
                      params={{ ...filters, q: params.q || undefined, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                    />
                  </>
                ) : params.q || params.status || r.store ? (
                  <NoMatches noun="products" q={params.q} />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                    <Heart aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                    <p className="text-sm text-fg-muted">No product is on a customer&apos;s wishlist yet.</p>
                  </div>
                )}
              </div>
            </section>
            {!wishlist && (
              <p className="text-caption text-fg-muted">
                Amount sold = items after store coupons, before tax, on orders that weren&apos;t canceled, returned or failed {label}. In stock: 0 = out of stock, under 10 = soon out.
              </p>
            )}
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
