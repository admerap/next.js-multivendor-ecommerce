import { Inbox, ListRestart } from "lucide-react";
import Link from "next/link";
import { ExportMenu } from "@/components/data/ExportMenu";
import { FilterPanel } from "@/components/data/FilterPanel";
import { NoMatches } from "@/components/data/NoMatches";
import { OrderStatusGrid } from "@/components/data/OrderStatusGrid";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { Button } from "@/components/ui/button";
import type { AdminOrderList as Data } from "@/lib/admin-orders.server";
import { withQuery } from "@/lib/list-params";
import { orderFilterLabel, statusSlug } from "@/lib/orders";
import { adminOrderListTitle, type AdminOrderListParams } from "@/lib/validations/admin-order";
import { AdminOrderTable } from "./AdminOrderTable";

export const ADMIN_ORDERS_PATH = "/admin/orders";

/** URL params of the current view (status + search + panel filters), defaults left out. */
export function adminOrderListParams(p: AdminOrderListParams) {
  return { status: p.status ? statusSlug(p.status) : undefined, q: p.q || undefined, store: p.store, payment: p.payment, from: p.from, to: p.to };
}

/**
 * Admin › Order Manage list — ONE component for All and every status (/admin/orders?status=…): the
 * "Current order summary" tiles, then the orders table with search, the Filter panel (store, payment,
 * dates), Export, pagination and its empty states. Data comes from listAdminOrders (platform-wide).
 */
export function AdminOrderList({ data, params }: { data: Data; params: AdminOrderListParams }) {
  const view = adminOrderListParams(params);
  const filtered = !!(params.q || params.store || params.payment || params.from || params.to);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="order-summary" className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="order-summary" className="font-display text-lg font-bold text-fg-strong">
            Current order summary
          </h2>
          {params.status && (
            <Button asChild variant="secondary">
              <Link href={ADMIN_ORDERS_PATH}>
                <ListRestart aria-hidden />
                Show all
              </Link>
            </Button>
          )}
        </div>
        <OrderStatusGrid counts={data.counts} ordersHref={ADMIN_ORDERS_PATH} active={params.status} />
      </section>

      <section aria-labelledby="order-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <h2 id="order-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
            {adminOrderListTitle(params)}
            <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
          </h2>
          <SearchForm action={ADMIN_ORDERS_PATH} q={params.q} placeholder="Search by order ID, customer or email" keep={{ ...view, q: undefined }} />
          <ExportMenu href={withQuery("/api/admin/orders/export", view)} />
          <FilterPanel
            action={ADMIN_ORDERS_PATH}
            fields={[
              { kind: "select", name: "store", label: "Store", anyLabel: "All stores", options: data.storeOptions.map((s) => ({ value: s.id, label: s.name })) },
              {
                kind: "select",
                name: "payment",
                label: "Payment",
                anyLabel: "Any",
                options: [
                  { value: "paid", label: "Paid" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "refunded", label: "Refunded" },
                ],
              },
              { kind: "date", name: "from", label: "From" },
              { kind: "date", name: "to", label: "To" },
            ]}
            values={{ store: params.store, payment: params.payment, from: params.from, to: params.to }}
            keep={{ status: view.status, q: view.q }}
          />
        </div>
        <div className="border-t border-line">
          {data.rows.length > 0 ? (
            <>
              <AdminOrderTable rows={data.rows} offset={(data.page - 1) * data.pageSize} />
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                total={data.total}
                pageSize={data.pageSize}
                noun="orders"
                params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
              />
            </>
          ) : filtered ? (
            <NoMatches noun="orders" q={params.q} />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Inbox aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
              <p className="text-sm text-fg-muted">No {params.status ? orderFilterLabel(params.status).toLowerCase() : ""} orders right now.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
