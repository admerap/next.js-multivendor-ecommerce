import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/account/orders/OrderCard";
import { OrdersSkeleton } from "@/components/account/orders/OrdersSkeleton";
import { OrdersToolbar } from "@/components/account/orders/OrdersToolbar";
import { EmptyState } from "@/components/data/DashCard";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { requireArea } from "@/lib/auth-guard";
import { listCustomerOrders } from "@/lib/orders.server";
import { CUSTOMER_ORDERS_PAGE_SIZE, customerOrderListSchema } from "@/lib/validations/customer-orders";

export const metadata: Metadata = { title: "My Orders" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const noOrders = (
  <EmptyState icon={ShoppingBag} title="No orders yet" description="When you place an order it will show up here so you can track it.">
    <Link href="/" className={buttonClasses.primary}>
      <ShoppingBag aria-hidden className="size-4" strokeWidth={2} />
      Start shopping
    </Link>
  </EmptyState>
);

/**
 * My Order (userOrder design): the signed-in customer's own orders — never anyone else's — newest
 * first, with status pills, search, sort and pagination. Orders the customer hid don't appear here.
 */
export default async function OrdersPage({ searchParams }: Props) {
  const user = await requireArea("CUSTOMER");
  const sp = await searchParams;
  const params = customerOrderListSchema.parse(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const list = await listCustomerOrders(user.id, params);

  return (
    <PreviewStateFrame
      className="mb-5 flex flex-wrap items-end justify-between gap-4"
      heading={
        <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">
          My Order <span className="text-fg-subtle tabular-nums">({list.all})</span>
        </h1>
      }
      loading={<OrdersSkeleton />}
      empty={noOrders}
      error={{ title: "Couldn't load your orders", description: "Something went wrong fetching your orders. Please try again." }}
    >
      {list.all === 0 ? (
        noOrders
      ) : (
        <div className="flex flex-col gap-4">
          <OrdersToolbar counts={list.counts} all={list.all} />
          {list.rows.length === 0 ? (
            <div className="rounded-lg bg-card shadow-sm">
              <NoMatches noun="orders" q={params.q} />
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {list.rows.map((o) => (
                  <li key={o.orderNumber}>
                    <OrderCard order={o} />
                  </li>
                ))}
              </ul>
              {list.pageCount > 1 && (
                <div className="rounded-lg bg-card shadow-sm">
                  <Pagination page={list.page} pageCount={list.pageCount} total={list.total} pageSize={CUSTOMER_ORDERS_PAGE_SIZE} params={{ q: params.q || undefined, status: params.status || undefined, sort: params.sort === "oldest" ? "oldest" : undefined }} noun="orders" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PreviewStateFrame>
  );
}
