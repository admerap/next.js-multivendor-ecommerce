import { ArrowLeft, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { VendorOrderDetail } from "@/components/vendor/orders/VendorOrderDetail";
import { requireArea } from "@/lib/auth-guard";
import { getVendorOrderView } from "@/lib/vendor-orders.server";

export const metadata: Metadata = { title: "Order Details" };

/**
 * Seller Center › Order details (vendororderdetails design). [id] is the StoreOrder id; the lookup is
 * scoped to the session's store, so another store's id is a 404 like an unknown one.
 */
export default async function VendorOrderPage({ params }: PageProps<"/vendor/orders/[id]">) {
  const user = await requireArea("VENDOR");
  const { id } = await params;
  const order = /^[a-z0-9]{1,40}$/i.test(id) ? await getVendorOrderView(id, user.vendorId!) : null;
  if (!order) notFound();

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/vendor/dashboard" },
          { label: "Order Manage", href: "/vendor/orders" },
          { label: `Order #${order.orderNumber}` },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
            <ShoppingCart aria-hidden className="size-5" strokeWidth={1.9} />
          </span>
          Order Details
        </h1>
        <Button asChild variant="secondary">
          <Link href="/vendor/orders">
            <ArrowLeft aria-hidden />
            Back to All Orders
          </Link>
        </Button>
      </div>
      <VendorOrderDetail order={order} />
    </>
  );
}
