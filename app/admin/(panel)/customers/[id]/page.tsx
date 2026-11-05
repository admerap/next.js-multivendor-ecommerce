import { ArrowLeft, MapPin, MessageSquareText, ShieldBan, ShoppingBag, Star, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerAvatar } from "@/components/admin/customers/AdminCustomerTable";
import { CustomerBlockSwitch } from "@/components/admin/customers/CustomerBlockSwitch";
import { Facts, SideCard } from "@/components/orders/DetailCards";
import { OrderProgressNote, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ProductThumb } from "@/components/products/ProductThumb";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/access.server";
import { getAdminCustomer } from "@/lib/admin-customers.server";
import { money } from "@/lib/money";
import { addressLines, adminOrderHref, orderDate, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { ADMIN_REVIEW_STATUS_LABEL, ADMIN_REVIEW_STATUS_TONE } from "@/lib/validations/admin-review";

export const metadata: Metadata = { title: "Customer Details" };

/**
 * Admin › Customer details: account, order figures, last shipping address, recent orders and the
 * reviews they wrote, with Block / Unblock. Not a customer / unknown id → 404.
 */
export default async function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requirePermission("customers");
  const { id } = await params;
  const c = /^[a-z0-9]{1,40}$/i.test(id) ? await getAdminCustomer(id) : null;
  if (!c) notFound();
  const blocked = !!c.blockedAt;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Customer List", href: "/admin/customers" }, { label: c.name }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex min-w-0 flex-wrap items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <CustomerAvatar name={c.name} image={c.image} size={40} />
          <span className="min-w-0 break-words">{c.name}</span>
          {blocked && (
            <Badge tone="error">
              <ShieldBan aria-hidden className="size-3.5" />
              Blocked
            </Badge>
          )}
        </h1>
        <Button asChild variant="secondary" className="max-sm:w-full">
          <Link href="/admin/customers">
            <ArrowLeft aria-hidden />
            Back to customers
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Figures */}
          <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Total orders", String(c._count.orders)],
                ["Lifetime spend", money(c.spent)],
                ["Reviews written", String(c._count.reviews)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-card p-5 shadow-sm">
                <div className="font-display text-[1.5rem] font-extrabold text-fg-strong tabular-nums">{value}</div>
                <div className="text-caption text-fg-muted">{label}</div>
              </div>
            ))}
          </section>

          <section aria-labelledby="recent-orders" className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
            <h2 id="recent-orders" className="flex items-center gap-2.5 border-b border-line px-5 py-4 font-display text-base font-bold text-fg-strong">
              <ShoppingBag aria-hidden className="size-4.5 text-primary" strokeWidth={2} />
              Recent orders
            </h2>
            {c.recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-fg-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {c.recentOrders.map((o) => (
                  <li key={o.orderNumber} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Link href={adminOrderHref(o.orderNumber)} className="inline-flex items-center text-sm font-bold !text-primary tabular-nums hover:underline max-lg:min-h-11">
                        #{o.orderNumber}
                      </Link>
                      <p className="truncate text-caption text-fg-muted">
                        {orderDate(o.createdAt)} · {o.stores.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <OrderStatusBadge status={o.status} />
                      <OrderProgressNote note={o.progressNote} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-fg-strong tabular-nums">{money(o.total)}</p>
                      <p className="text-caption text-fg-muted">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {c._count.orders > c.recentOrders.length && (
              <p className="border-t border-line px-5 py-3 text-caption text-fg-muted">
                Showing the latest {c.recentOrders.length} of {c._count.orders} orders.{" "}
                <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="inline-flex items-center font-semibold !text-primary hover:underline max-lg:min-h-11">
                  See all in Order Manage
                </Link>
              </p>
            )}
          </section>

          <section aria-labelledby="customer-reviews" className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
            <h2 id="customer-reviews" className="flex items-center gap-2.5 border-b border-line px-5 py-4 font-display text-base font-bold text-fg-strong">
              <MessageSquareText aria-hidden className="size-4.5 text-primary" strokeWidth={2} />
              Reviews written
            </h2>
            {c.reviews.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-fg-muted">No reviews yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {c.reviews.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                    <ProductThumb src={r.product.thumbnail} name={r.product.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/reviews/${r.id}`} className="line-clamp-1 text-sm font-semibold !text-fg-strong hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                        {r.product.name}
                      </Link>
                      <p className="line-clamp-2 text-sm text-fg">{r.comment}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-fg-muted tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-fg-strong">
                          <Star aria-hidden className="size-3.5 fill-rating text-rating" />
                          {r.rating}.0
                        </span>
                        · {orderDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={ADMIN_REVIEW_STATUS_TONE[r.status]}>{ADMIN_REVIEW_STATUS_LABEL[r.status]}</Badge>
                      {r.status === "APPROVED" && !r.isVisible && <span className="text-caption font-semibold text-fg-muted">Hidden</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <SideCard icon={ShieldBan} title="Account status">
            <div className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3.5 py-1">
              <span className="text-sm font-semibold text-fg-strong">Active customer</span>
              <CustomerBlockSwitch key={String(blocked)} id={c.id} name={c.name} blocked={blocked} />
            </div>
            <p className="mt-3 text-caption text-fg-muted">
              {blocked
                ? `Blocked ${orderDate(c.blockedAt!)} — can't sign in or shop. Orders and reviews are kept.`
                : "Blocking signs them out and stops sign-in and checkout. Orders and reviews are kept."}
            </p>
          </SideCard>

          <SideCard icon={UserRound} title="Customer info">
            <Facts
              rows={[
                ["Name", c.name],
                ["Email", <span key="e" className="break-all">{c.email}</span>],
                ["Phone", c.phone || "—"],
                ["Customer since", orderDate(c.createdAt)],
                ["Wishlist", `${c._count.wishlist} ${c._count.wishlist === 1 ? "item" : "items"}`],
              ]}
            />
          </SideCard>

          <SideCard icon={MapPin} title="Last shipping address">
            {c.lastAddress ? (
              <>
                <p className="text-sm font-semibold text-fg-strong">{c.lastAddress.name}</p>
                {addressLines(c.lastAddress).map((l) => (
                  <p key={l} className="text-sm text-fg">
                    {l}
                  </p>
                ))}
                <p className="mt-2 text-sm text-fg-muted tabular-nums">{c.lastAddress.phone}</p>
              </>
            ) : (
              <p className="text-sm text-fg-muted">No address yet — it&apos;s saved with their first order.</p>
            )}
          </SideCard>
        </div>
      </div>
    </>
  );
}
