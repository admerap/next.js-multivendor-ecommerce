import { PackageSearch, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminStockTable } from "@/components/admin/reports/AdminStockTable";
import { EmptyState } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportFilters, ReportHeading, ReportTabs } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requirePermission } from "@/lib/access.server";
import { getAdminStockReport } from "@/lib/admin-reports.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { toneClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { adminStockReportSchema, STOCK_LEVEL_LABEL, STOCK_LEVEL_TONE, STOCK_LEVELS, STOCK_SORTS, type StockLevel } from "@/lib/validations/admin-report";
import { LOW_STOCK } from "@/lib/validations/product";

export const metadata: Metadata = { title: "Product Stock Report" };

const PATH = "/admin/reports/stock";
const ERROR = { title: "Couldn't load this report", description: "The reporting service didn't respond. Check your connection and try again." };

const noStock = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={PackageSearch} title="No stock data yet" description="Once stores list physical products on Sundry, their stock levels show up here." />
  </section>
);

/**
 * Admin › Report Manage › Product Stock Report (adminproductstock design) — live inventory across every store,
 * read-only and current-state (not date-ranged). Levels follow the design: 0 = Out of stock, under 10 = Soon
 * stock out, otherwise In stock. Digital products have no stock and are left out. Store, category, sort,
 * level chip, search and page all live in the URL.
 */
export default async function AdminStockReportPage({ searchParams }: PageProps<"/admin/reports/stock">) {
  await requirePermission("reports");
  const params = adminStockReportSchema.parse(firstParams(await searchParams));
  const r = await getAdminStockReport(params); // throws → error.tsx (Retry)
  const base = { store: r.store, category: r.category, sort: params.sort === "low" ? undefined : params.sort, q: params.q || undefined };
  const filters = { ...base, level: params.level };
  const chips: { key: StockLevel | undefined; label: string; count: number; dot: string }[] = [
    { key: undefined, label: "All", count: r.counts.all, dot: "bg-fg-muted" },
    ...STOCK_LEVELS.map((l) => ({ key: l, label: STOCK_LEVEL_LABEL[l], count: r.counts[l], dot: toneClasses[STOCK_LEVEL_TONE[l]].dot })),
  ];

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Report Manage" }, { label: "Product Stock Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ReportHeading icon={PackageSearch} title="Product Stock Report" />
            <p className="mt-1.5 text-[0.9rem] text-fg-muted">Stock levels for every product, so nothing sells out unnoticed.</p>
          </div>
        }
        loading={<ReportSkeleton />}
        empty={noStock}
        error={ERROR}
      >
        {!r.hasData ? (
          noStock
        ) : (
          <div className="flex flex-col gap-5">
            <ReportTabs
              tabs={[
                { label: "All Products", href: withQuery("/admin/reports/products", { store: r.store }), current: false },
                { label: "Product Stock", href: PATH, current: true },
                { label: "Wish Listed Products", href: withQuery("/admin/reports/products", { store: r.store, tab: "wishlist" }), current: false },
              ]}
            />

            <ReportFilters
              action={PATH}
              keep={{ level: params.level }}
              selects={[
                { name: "store", label: "Store", value: r.store ?? "", options: [{ value: "", label: "All stores" }, ...r.stores.map((s) => ({ value: s.id, label: s.name }))] },
                { name: "category", label: "Category", value: r.category ?? "", options: [{ value: "", label: "All categories" }, ...r.categories.map((c) => ({ value: c.id, label: c.name }))] },
                { name: "sort", label: "Sort by stock", value: params.sort, options: Object.entries(STOCK_SORTS).map(([value, label]) => ({ value, label })) },
              ]}
            />

            <section aria-labelledby="stock-table" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="stock-table" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                  Total products
                  <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{r.table.total}</span>
                </h2>
                <SearchForm action={PATH} q={params.q} placeholder="Search by product name" keep={{ ...filters, q: undefined }} />
                <ExportMenu href={withQuery("/api/admin/reports/stock/export", filters)} />
              </div>

              {/* Level chips (design): counts follow the store / category / search filters. */}
              <nav aria-label="Stock level" className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-6">
                {chips.map((c) => {
                  const on = params.level === c.key;
                  return (
                    <Link
                      key={c.label}
                      href={withQuery(PATH, { ...base, level: c.key })}
                      aria-current={on ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-(--dur-fast)",
                        on ? "border-primary bg-iris-50 !text-primary" : "border-line bg-card !text-fg hover:border-primary",
                      )}
                    >
                      <span aria-hidden className={cn("size-2 rounded-full", c.dot)} />
                      {c.label}
                      <span className="tabular-nums text-fg-muted">{c.count}</span>
                    </Link>
                  );
                })}
              </nav>
              {r.variationAlerts > 0 && (
                <p className="flex items-start gap-2 border-t border-line bg-error-50 px-4 py-2.5 text-sm text-error-600 sm:px-6">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <b>{r.variationAlerts}</b> {r.variationAlerts === 1 ? "product has" : "products have"} a variation sold out even though the product total is in stock — see the
                    red notes under Current stock.
                  </span>
                </p>
              )}

              <div className="border-t border-line">
                {r.table.rows.length > 0 ? (
                  <>
                    <AdminStockTable rows={r.table.rows} offset={(r.table.page - 1) * r.table.pageSize} />
                    <Pagination
                      page={r.table.page}
                      pageCount={r.table.pageCount}
                      total={r.table.total}
                      pageSize={r.table.pageSize}
                      noun="products"
                      params={{ ...filters, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 pb-8">
                    <NoMatches noun="products" q={params.q} />
                    <Link href={PATH} className="inline-flex min-h-11 items-center text-sm font-semibold !text-primary hover:underline">
                      Reset filters
                    </Link>
                  </div>
                )}
              </div>
            </section>
            <p className="text-caption text-fg-muted">
              Live stock, right now. Out of stock = 0 · Soon stock out = under {LOW_STOCK} · a product with variations shows the total of all its variations, with
              any variation that&apos;s sold out or low listed underneath. Last updated = the last change to the product (stock or details). Digital products don&apos;t keep
              stock and aren&apos;t listed.
            </p>
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
