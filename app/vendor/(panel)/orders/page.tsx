import { FileDown, ListRestart, Package, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { OrderStatusGrid } from "@/components/data/OrderStatusGrid";
import { Pagination } from "@/components/data/Pagination";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { VendorOrderTable } from "@/components/vendor/orders/VendorOrderTable";
import { requireArea } from "@/lib/auth-guard";
import { firstParams } from "@/lib/list-params";
import { orderFilterLabel, statusSlug, type OrderStatusKey } from "@/lib/orders";
import { vendorOrderListSchema } from "@/lib/validations/vendor-order";
import { listVendorOrders } from "@/lib/vendor-orders.server";

export const metadata: Metadata = { title: "Orders" };

/** Export link for the list as currently filtered (status + search). */
function exportHref({ q, status }: { q: string; status: OrderStatusKey | null }) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", statusSlug(status));
  if (q) sp.set("q", q);
  return `/api/vendor/orders/export${sp.size ? `?${sp}` : ""}`;
}

const ERROR = { title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." };

const emptyState = (storeName: string) => (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={ShoppingCart} title="No orders yet" description={`When buyers purchase from ${storeName}, their orders will appear here for you to confirm and ship.`}>
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
 * Seller Center › Order Manage (vendororderlist design): this store's part of each customer order
 * (its StoreOrders), filtered by ?status from the sidebar / summary tiles. Scoped to the session vendor.
 */
export default async function VendorOrdersPage({ searchParams }: PageProps<"/vendor/orders">) {
  const user = await requireArea("VENDOR");
  const params = vendorOrderListSchema.parse(firstParams(await searchParams));
  const data = await listVendorOrders(user.vendorId!, params); // throws → error.tsx (Retry)
  const title = params.status ? `${orderFilterLabel(params.status)} Orders` : "All Orders";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Order Manage" }, { label: title }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={ShoppingCart} title={title} total={data.total} noun="orders" />}
        loading={<ListSkeleton label="Loading orders" />}
        empty={emptyState(data.storeName)}
        error={ERROR}
      >
        {data.allCount === 0 ? (
          emptyState(data.storeName)
        ) : (
          <div className="flex flex-col gap-5">
            <section aria-labelledby="order-summary" className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="order-summary" className="font-display text-lg font-bold text-fg-strong">
                  Current Order Summary
                </h2>
                {params.status && (
                  <Button asChild variant="secondary">
                    <Link href="/vendor/orders">
                      <ListRestart aria-hidden />
                      Show all orders
                    </Link>
                  </Button>
                )}
              </div>
              <OrderStatusGrid counts={data.counts} ordersHref="/vendor/orders" active={params.status} />
            </section>

            <section aria-label="Order list" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <ListToolbar
                searchLabel="Search by order ID or customer"
                statuses={null}
                actions={
                  <Button asChild variant="secondary">
                    {/* Every page of the current filter, as CSV (the route re-applies the store scope). */}
                    <a href={exportHref(params)} download>
                      <FileDown aria-hidden />
                      Export
                    </a>
                  </Button>
                }
              />
              <div className="border-t border-line">
                {data.rows.length > 0 ? (
                  <>
                    <VendorOrderTable items={data.rows} offset={(data.page - 1) * data.pageSize} />
                    <Pagination
                      page={data.page}
                      pageCount={data.pageCount}
                      total={data.total}
                      pageSize={data.pageSize}
                      noun="orders"
                      params={{
                        q: params.q || undefined,
                        status: params.status ? statusSlug(params.status) : undefined,
                        pageSize: data.pageSize === 10 ? undefined : String(data.pageSize),
                      }}
                    />
                  </>
                ) : (
                  <NoMatches noun="orders" q={params.q} />
                )}
              </div>
            </section>
          </div>
        )}
      </PreviewStateFrame>
    </>
  );
}
