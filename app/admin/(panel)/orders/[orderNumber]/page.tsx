import { ArrowLeft, Download, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderDetail } from "@/components/admin/orders/AdminOrderDetail";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/access.server";
import { getAdminOrder } from "@/lib/admin-orders.server";
import { adminInvoiceHref } from "@/lib/orders";

export const metadata: Metadata = { title: "Order Details" };

/** Admin › Order details: the complete order, every store's part. Read-only; unknown number → 404. */
export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderNumber]">) {
  await requirePermission("orders");
  const { orderNumber } = await params;
  const n = /^\d{1,10}$/.test(orderNumber) ? Number(orderNumber) : NaN;
  const order = Number.isSafeInteger(n) ? await getAdminOrder(n) : null;
  if (!order) notFound();

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Order Manage", href: "/admin/orders" },
          { label: `Order #${order.orderNumber}` },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
            <ShoppingCart aria-hidden className="size-5" strokeWidth={1.9} />
          </span>
          <span className="tabular-nums">Order #{order.orderNumber}</span>
        </h1>
        <div className="flex flex-wrap gap-2.5 max-sm:w-full">
          <Button asChild variant="secondary" className="max-sm:flex-1">
            <Link href="/admin/orders">
              <ArrowLeft aria-hidden />
              Back to orders
            </Link>
          </Button>
          <Button asChild className="max-sm:flex-1">
            <a href={adminInvoiceHref(order.orderNumber)} download className="!text-on-primary">
              <Download aria-hidden />
              Download invoice
            </a>
          </Button>
        </div>
      </div>
      <AdminOrderDetail order={order} />
    </>
  );
}
