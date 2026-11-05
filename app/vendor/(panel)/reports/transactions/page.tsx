import { ArrowDownToLine, CalendarRange, Check, Clock, HandCoins, Package, Percent, Receipt, ReceiptText, ShoppingCart, Tag, Undo2, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart, DoughnutChart } from "@/components/data/Chart";
import { DashCard, EmptyState, IconTile } from "@/components/data/DashCard";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/data/ExportMenu";
import { SearchForm } from "@/components/data/SearchForm";
import { Legend, paymentDonut, ReportFilters, ReportHeading, ReportTabs, type ReportSelect } from "@/components/reports/ReportKit";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ExpenseTable, OrderTransactionTable } from "@/components/vendor/reports/TransactionTables";
import { requireArea } from "@/lib/auth-guard";
import { firstParams, withQuery } from "@/lib/list-params";
import { money } from "@/lib/money";
import type { Tone } from "@/lib/tones";
import { REPORT_RANGE_LABEL, transactionReportSchema } from "@/lib/validations/vendor-report";
import { getTransactionReport } from "@/lib/vendor-reports.server";

export const metadata: Metadata = { title: "Transactions Report" };

const PATH = "/vendor/reports/transactions";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." };

const noTransactions = (store: string) => (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={Receipt} title="No transactions yet" description={`When buyers pay for ${store} orders, every payment and expense will be listed here.`}>
      <Button asChild>
        <Link href="/vendor/products" className="!text-on-primary">
          <Package aria-hidden />
          Go to Product List
        </Link>
      </Button>
    </EmptyState>
  </section>
);

function Stat({ icon, tone, value, label }: { icon: typeof Wallet; tone: Tone; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-md bg-sunken p-3.5">
      <IconTile icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <div className="truncate font-display text-xl leading-tight font-extrabold text-fg-strong tabular-nums">{value}</div>
        <div className="text-caption text-fg-muted">{label}</div>
      </div>
    </div>
  );
}

/**
 * Seller Center › Report Manage › Transactions Report (vendortransactionreport design) — read-only,
 * computed on every request from this store's orders (COD today). Earnings are split into realized
 * (delivered) and pending (still on the way); payouts arrive with Stripe Connect and are a labelled TODO.
 */
export default async function TransactionReportPage({ searchParams }: PageProps<"/vendor/reports/transactions">) {
  const user = await requireArea("VENDOR");
  const params = transactionReportSchema.parse(firstParams(await searchParams));
  const r = await getTransactionReport(user.vendorId!, params); // throws → error.tsx (Retry)
  const rangeLabel = REPORT_RANGE_LABEL[params.range];
  const range = params.range === "year" ? undefined : params.range;
  const expensesTab = params.tab === "expenses";
  const tab = expensesTab ? "expenses" : undefined;
  const keep = { range, tab, payment: expensesTab ? undefined : params.payment, customer: expensesTab ? undefined : params.customer };
  const table = expensesTab ? r.expenseRows! : r.orders!;
  const e = r.earnings;

  const selects: ReportSelect[] = expensesTab
    ? []
    : [
        {
          name: "payment",
          label: "Payment status",
          value: params.payment ?? "",
          options: [
            { value: "", label: "All statuses" },
            { value: "completed", label: "Completed" },
            { value: "pending", label: "Pending" },
            { value: "refunded", label: "Refunded" },
          ],
        },
        { name: "customer", label: "Customer", value: params.customer ?? "", options: [{ value: "", label: "All customers" }, ...r.customers.map((c) => ({ value: c.id, label: c.name }))] },
      ];

  const pay = paymentDonut(r.paymentSplit);
  const exp = [
    { label: "Commission", legend: "Commission", value: r.expenses.commission, token: "--color-primary", dot: "bg-primary" },
    { label: "Coupon discounts", legend: "Coupon discounts", value: r.expenses.coupon, token: "--saffron-400", dot: "bg-saffron-400" },
  ];
  const donut = expensesTab ? exp : pay;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Report Manage" }, { label: "Transactions Report" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ReportHeading icon={Receipt} title="Transactions Report" />}
        loading={<ReportSkeleton />}
        empty={noTransactions(r.storeName)}
        error={ERROR}
      >
        {!r.hasAnyOrders ? (
          noTransactions(r.storeName)
        ) : (
          <div className="flex flex-col gap-5">
            <ReportTabs
              tabs={[
                { label: "Order Transactions", href: withQuery(PATH, { range }), current: !expensesTab },
                { label: "Expense Transactions", href: withQuery(PATH, { range, tab: "expenses" }), current: expensesTab },
              ]}
            />

            <ReportFilters action={PATH} range={params.range} selects={selects} keep={{ tab }} />

            {r.counts.total === 0 && r.earnings.realized.gross === 0 && r.expenses.total === 0 ? (
              <section className="rounded-lg bg-card shadow-sm">
                <EmptyState bare icon={CalendarRange} title="No transactions in this range" description={`Your store has no paid or pending orders for ${rangeLabel.toLowerCase()}. Try a longer date range.`}>
                  {params.range !== "year" && (
                    <Button asChild variant="secondary">
                      <Link href={withQuery(PATH, { tab })}>
                        <CalendarRange aria-hidden />
                        Show this year
                      </Link>
                    </Button>
                  )}
                </EmptyState>
              </section>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)_minmax(250px,1fr)]">
                  <section aria-label={expensesTab ? "Expense summary" : "Transaction summary"} className="flex min-w-0 flex-col gap-2.5 rounded-lg bg-card p-4 shadow-sm">
                    {expensesTab ? (
                      <>
                        <Stat icon={Wallet} tone="error" value={money(r.expenses.total)} label="Total expense" />
                        <Stat icon={Tag} tone="iris" value={money(r.expenses.coupon)} label="Coupon discounts" />
                        <Stat icon={Percent} tone="info" value={money(r.expenses.commission)} label="Commission charged" />
                        <div className="flex min-w-0 items-center gap-3.5 rounded-md bg-sunken p-3.5" title="Product discounts aren't recorded on past orders">
                          <IconTile icon={Package} tone="saffron" size="lg" />
                          <div>
                            <div className="font-display text-xl leading-tight font-extrabold text-fg-subtle">—</div>
                            <div className="text-caption text-fg-muted">Product discounts (not recorded)</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Stat icon={ShoppingCart} tone="iris" value={r.counts.total.toLocaleString("en-US")} label="Total transactions" />
                        <Stat icon={Check} tone="success" value={r.counts.completed.toLocaleString("en-US")} label="Completed" />
                        <Stat icon={Clock} tone="warning" value={r.counts.pending.toLocaleString("en-US")} label="Pending" />
                        <Stat icon={Undo2} tone="error" value={r.counts.refunded.toLocaleString("en-US")} label="Refunded" />
                      </>
                    )}
                  </section>

                  <DashCard
                    title={expensesTab ? "Expense Statistics" : "Order Statistics"}
                    icon={expensesTab ? ReceiptText : Receipt}
                    className="lg:order-last lg:col-span-2 xl:order-none xl:col-span-1"
                    actions={
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money((expensesTab ? r.chart.expense : r.chart.amount).reduce((a, b) => a + b, 0))}</div>
                        <div className="text-caption text-fg-muted">{rangeLabel}</div>
                      </div>
                    }
                  >
                    <BarChart
                      className="relative mt-4 h-64 sm:h-72"
                      label={expensesTab ? "Expense statistics chart" : "Order statistics chart"}
                      seriesLabel={expensesTab ? "Expense" : "Order amount"}
                      format="cents"
                      labels={r.chart.labels}
                      data={expensesTab ? r.chart.expense : r.chart.amount}
                    />
                  </DashCard>

                  <DashCard title={expensesTab ? "Expense Split" : "Payment Statistics"} icon={Wallet} tone="success">
                    <div className="relative mx-auto mt-5 size-48">
                      <DoughnutChart className="absolute inset-0" label={expensesTab ? "Expense split chart" : "Payment split chart"} format="cents" labels={donut.map((d) => d.label)} data={donut.map((d) => d.value)} tokens={donut.map((d) => d.token)} />
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <div className="font-display text-lg font-extrabold text-fg-strong tabular-nums">{money(expensesTab ? r.expenses.total : r.paymentSplit.paid)}</div>
                          <div className="text-caption text-fg-muted">{expensesTab ? "Total expense" : "Completed payments"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Legend items={donut.map((d) => ({ label: d.legend, value: money(d.value), dot: d.dot }))} />
                    </div>
                  </DashCard>
                </div>

                {/* Earnings: what the store actually made (delivered) vs what's still on its way. */}
                <section aria-labelledby="earnings" className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
                  <h2 id="earnings" className="font-display text-lg font-bold text-fg-strong">
                    Earnings
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">Items after coupons, minus Sundry&apos;s commission — counted on the day each order is delivered. Shipping and tax aren&apos;t part of your earnings.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md bg-success-50 p-4">
                      <div className="font-display text-xl font-extrabold text-fg-strong tabular-nums">{money(e.realized.net)}</div>
                      <div className="text-caption font-semibold text-success-600">Net earnings · delivered</div>
                      <div className="mt-1 text-caption text-fg-muted tabular-nums">
                        {money(e.realized.gross)} − {money(e.realized.commission)} commission
                      </div>
                    </div>
                    <div className="rounded-md bg-sunken p-4">
                      <div className="font-display text-xl font-extrabold text-fg-strong tabular-nums">{money(e.pending.net)}</div>
                      <div className="text-caption font-semibold text-fg-muted">Pending earnings · est.</div>
                      <div className="mt-1 text-caption text-fg-muted tabular-nums">
                        {money(e.pending.gross)} − {money(e.pending.commission)} est. commission
                      </div>
                    </div>
                    <div className="rounded-md bg-sunken p-4">
                      <div className="font-display text-xl font-extrabold text-fg-strong tabular-nums">{money(e.realized.commission)}</div>
                      <div className="text-caption font-semibold text-fg-muted">Commission charged</div>
                      <div className="mt-1 text-caption text-fg-muted">Only on delivered orders</div>
                    </div>
                    <div className="rounded-md bg-sunken p-4">
                      <div className="font-display text-xl font-extrabold text-fg-strong tabular-nums">{money(e.refunded)}</div>
                      <div className="text-caption font-semibold text-fg-muted">Refunded to buyers</div>
                      <div className="mt-1 text-caption text-fg-muted">Returns earn nothing</div>
                    </div>
                  </div>
                  {expensesTab && r.expenses.pendingCommission > 0 && (
                    <p className="mt-3 text-sm text-fg-muted">
                      Orders still on their way will add about <b className="text-fg-strong tabular-nums">{money(r.expenses.pendingCommission)}</b> in commission once delivered.
                    </p>
                  )}
                </section>

                <section aria-labelledby="tx-table" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 id="tx-table" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                      {expensesTab ? "Expense Transactions" : "Order Transactions"}
                      <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{table.total}</span>
                    </h2>
                    <SearchForm action={PATH} q={params.q} placeholder={expensesTab ? "Search by order ID or XID" : "Search by order ID or customer"} keep={keep} />
                    <ExportMenu href={withQuery("/api/vendor/reports/transactions/export", { ...keep, q: params.q || undefined })} />
                  </div>
                  <div className="border-t border-line">
                    {table.rows.length > 0 ? (
                      <>
                        {expensesTab ? <ExpenseTable rows={r.expenseRows!.rows} offset={(table.page - 1) * table.pageSize} /> : <OrderTransactionTable rows={r.orders!.rows} offset={(table.page - 1) * table.pageSize} />}
                        <Pagination
                          page={table.page}
                          pageCount={table.pageCount}
                          total={table.total}
                          pageSize={table.pageSize}
                          noun="transactions"
                          params={{ ...keep, q: params.q || undefined, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                        />
                      </>
                    ) : params.q || params.payment || params.customer ? (
                      <NoMatches noun="transactions" q={params.q} />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                        <ReceiptText aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                        <p className="text-sm text-fg-muted">No expenses yet — commission and coupons are counted once an order is delivered.</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Scope honesty: payouts don't exist yet (COD only; Stripe Connect later). No rows are made up. */}
            <section aria-labelledby="payouts" className="rounded-lg border border-dashed border-line-strong bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <IconTile icon={HandCoins} tone="neutral" size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 id="payouts" className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-fg-strong">
                    Payouts &amp; withdrawals
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 font-sans text-caption font-bold tracking-[0.04em] text-fg-muted uppercase">Coming with Stripe</span>
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                    Orders are paid cash on delivery today, collected by Sundry&apos;s couriers. Transfers to your bank — payouts, withdrawals and their status — will be listed here once Stripe Connect payouts are set up. Nothing is shown until then.
                  </p>
                </div>
                <ArrowDownToLine aria-hidden className="size-5 text-fg-subtle" />
              </div>
            </section>
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
