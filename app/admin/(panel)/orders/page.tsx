import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { AdminOrderList } from "@/components/admin/orders/AdminOrderList";
import { EmptyState } from "@/components/data/DashCard";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requirePermission } from "@/lib/access.server";
import { listAdminOrders } from "@/lib/admin-orders.server";
import { firstParams } from "@/lib/list-params";
import { adminOrderListSchema, adminOrderListTitle } from "@/lib/validations/admin-order";

export const metadata: Metadata = { title: "Orders" };

const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the orders. Check your connection and try again." };
const noOrders = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={ShoppingCart} title="No orders yet" description="When shoppers check out, every order — across all stores — appears here." />
  </section>
);

/**
 * Admin › Order Manage (adminallorders design): every order on the platform, one page for All and each
 * status (?status=). Read-only oversight — stores move their own parts; admin views and exports.
 */
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requirePermission("orders");
  const params = adminOrderListSchema.parse(firstParams(await searchParams));
  const data = await listAdminOrders(params); // throws → error.tsx (Retry)
  const title = adminOrderListTitle(params);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Order Manage" }, { label: title }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={ShoppingCart} title={title} total={data.total} noun="orders" />
            <p className="mt-1 text-sm text-fg-muted">Every order across all stores. An order with several stores is listed under its least advanced part.</p>
          </div>
        }
        loading={<ListSkeleton label="Loading orders" />}
        empty={noOrders}
        error={ERROR}
      >
        {data.platformTotal === 0 ? noOrders : <AdminOrderList data={data} params={params} />}
      </PreviewStateFrame>
    </>
  );
}
