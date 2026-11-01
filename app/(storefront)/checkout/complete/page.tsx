import { Banknote, Check, FileDown, MapPin, Package, PackageCheck, ShoppingBag, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CopyOrderId } from "@/components/checkout/CopyOrderId";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { SHIPPING_METHOD_INFO } from "@/lib/checkout";
import { money } from "@/lib/money";
import { addressLines, invoiceHref, orderAddress, orderDate, PAYMENT_METHOD_LABEL } from "@/lib/orders";
import { getCustomerOrder } from "@/lib/orders.server";
import { productHref, sellerHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string | string[] }> };

/**
 * Order confirmation (Order Complete design) — a real URL (/checkout/complete?order=100001), so a refresh
 * or a bookmark still works. Only the customer who placed the order can see it; any other number is a
 * 404. Under the design's card: the order split by seller, delivery address, payment, and what's next.
 */
export default async function OrderCompletePage({ searchParams }: Props) {
  const raw = (await searchParams).order;
  const number = typeof raw === "string" && /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout/complete?order=${typeof raw === "string" ? raw : ""}`)}`);
  const order = Number.isSafeInteger(number) ? await getCustomerOrder(number, session.user.id) : null;
  if (!order) notFound();

  const ship = orderAddress(order, "ship");
  const cod = order.paymentMethod === "COD" && order.paymentStatus === "UNPAID";
  const items = order.storeOrders.reduce((n, s) => n + s.items.reduce((m, i) => m + i.qty, 0), 0);

  return (
    <main className="pb-4">
      {/* Design card */}
      <section className={cn(pageContainer, "max-w-160 pt-[clamp(32px,6vw,56px)]")}>
        <div className="flex flex-col items-center rounded-xl bg-card px-[clamp(20px,5vw,40px)] py-12 text-center shadow-lg">
          <span className="grid size-22 place-items-center rounded-full bg-success-500 shadow-lg">
            <Check aria-hidden className="size-11 text-on-primary" strokeWidth={2.6} />
          </span>
          <h1 className="mt-6 mb-3 font-display text-[clamp(1.6rem,4vw,1.9rem)] font-extrabold tracking-[-0.02em] text-balance text-fg-strong">Thank You for Your Purchase!</h1>
          <p className="max-w-115 text-[0.94rem] leading-relaxed text-pretty text-fg-muted">
            We have received your order and each seller will process their part shortly. You can track your order at any time using your order details.
          </p>
          <div className="mt-7 flex w-full max-w-105 items-center gap-3 rounded-full border-[1.5px] border-line py-2 pr-2 pl-5">
            <span className="flex-1 text-left text-[0.94rem] font-semibold text-fg-strong">
              Order ID <span className="tabular-nums">#{order.orderNumber}</span>
            </span>
            <CopyOrderId orderNumber={order.orderNumber} />
          </div>
          <a href={invoiceHref(order.orderNumber)} download className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-primary hover:underline">
            <FileDown aria-hidden className="size-4.5" strokeWidth={2} />
            Download Invoice
          </a>
          <div className="mt-8 flex w-full flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="min-w-45 flex-1">
              <Link href={`/account/track-order?order=${order.orderNumber}`}>
                <Truck aria-hidden />
                Track Order
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="min-w-45 flex-1">
              <Link href="/">
                <ShoppingBag aria-hidden />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Order details, split by seller */}
      <section aria-labelledby="order-details" className={cn(pageContainer, "max-w-200 pt-10")}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 id="order-details" className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-fg-strong">
            Order details
          </h2>
          <p className="text-sm text-fg-muted">
            Placed {orderDate(order.createdAt)} · {items} {items === 1 ? "item" : "items"} from {order.storeOrders.length} {order.storeOrders.length === 1 ? "seller" : "sellers"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg bg-card p-5 shadow-sm">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.9} />
            <div className="min-w-0 text-sm">
              <p className="mb-1 font-bold text-fg-strong">Delivering to {ship.name}</p>
              {addressLines(ship).map((l) => (
                <p key={l} className="text-fg-muted">
                  {l}
                </p>
              ))}
              <p className="text-fg-muted">{ship.phone}</p>
              <p className="mt-1.5 font-semibold text-fg-strong">
                {SHIPPING_METHOD_INFO[order.shippingMethod].label} <span className="font-normal text-fg-muted">· {SHIPPING_METHOD_INFO[order.shippingMethod].eta}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg bg-card p-5 shadow-sm">
            <Banknote aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.9} />
            <div className="min-w-0 text-sm">
              <p className="mb-1 font-bold text-fg-strong">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
              {cod ? (
                <p className="text-fg-muted">
                  Pay <b className="text-fg-strong tabular-nums">{money(order.total)}</b> in cash when your order arrives. Have the exact amount ready.
                </p>
              ) : (
                <p className="text-fg-muted">Payment status: {order.paymentStatus.toLowerCase()}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {order.storeOrders.map((s) => (
            <article key={s.id} aria-label={`From ${s.vendor.storeName}`} className="overflow-hidden rounded-lg bg-card shadow-sm">
              <header className="flex flex-wrap items-center gap-2.5 border-b border-line bg-sunken px-5 py-3">
                <Store aria-hidden className="size-4.5 text-primary" strokeWidth={1.9} />
                <Link href={sellerHref(s.vendor.slug)} className="inline-flex min-h-11 items-center font-display font-extrabold !text-fg-strong hover:!text-primary lg:min-h-0">
                  {s.vendor.storeName}
                </Link>
                <span className="ml-auto">
                  <OrderStatusBadge status={s.status} />
                </span>
              </header>
              <ul className="divide-y divide-line px-5">
                {s.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3.5 py-3.5">
                    <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
                      {i.image ? <Image src={i.image} alt="" fill sizes="56px" className="object-cover" /> : <Package aria-hidden className="size-6 text-iris-400" strokeWidth={1.5} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {i.productSlug ? (
                        <Link href={productHref(i.productSlug)} className="line-clamp-2 text-sm font-semibold !text-fg-strong hover:!text-primary max-lg:py-3">
                          {i.productName}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{i.productName}</p>
                      )}
                      <p className="text-caption text-fg-muted tabular-nums">
                        {i.variationName && <>{i.variationName} · </>}
                        {money(i.unitPrice)} × {i.qty}
                      </p>
                    </div>
                    <b className="text-sm text-fg-strong tabular-nums">{money(i.unitPrice * i.qty)}</b>
                  </li>
                ))}
              </ul>
              <dl className="grid gap-1 border-t border-line px-5 py-3.5 text-[0.81rem] text-fg-muted">
                <Row label="Subtotal" value={money(s.subtotal)} />
                {s.discount > 0 && <Row label={`Discount${s.couponCode ? ` (${s.couponCode})` : ""}`} value={`− ${money(s.discount)}`} tone="success" />}
                {s.discount === 0 && s.couponCode && <Row label={`Coupon ${s.couponCode}`} value="Free delivery" tone="success" />}
                <Row label="Shipping" value={s.shipping === 0 ? "Free" : money(s.shipping)} />
                <Row label="Tax" value={money(s.tax)} />
                <Row label={`${s.vendor.storeName} total`} value={money(s.total)} strong />
              </dl>
            </article>
          ))}
        </div>

        <dl aria-label="Order total" className="mt-4 grid gap-1.5 rounded-lg bg-card p-5 text-sm text-fg shadow-sm">
          <Row label="Sub total" value={money(order.subtotal)} />
          <Row label={order.shippingMethod === "EXPRESS" ? "Shipping (Express)" : "Shipping"} value={order.shipping === 0 ? "Free" : money(order.shipping)} />
          <Row label="Discount" value={`− ${money(order.discount)}`} tone="success" />
          <Row label="Tax" value={money(order.tax)} />
          <div aria-hidden className="my-1.5 h-px bg-line" />
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[1.06rem] font-bold text-primary">Total</dt>
            <dd className="text-[1.25rem] font-extrabold text-primary tabular-nums">{money(order.total)}</dd>
          </div>
        </dl>

        <section aria-labelledby="next-steps" className="mt-4 rounded-lg bg-card p-5 shadow-sm">
          <h3 id="next-steps" className="mb-3 font-display font-extrabold text-fg-strong">
            What happens next
          </h3>
          <ol className="grid gap-3 text-sm text-fg sm:grid-cols-3">
            {[
              { icon: PackageCheck, title: "Sellers confirm", text: `Each of the ${order.storeOrders.length === 1 ? "seller" : `${order.storeOrders.length} sellers`} confirms and packs their part of your order.` },
              { icon: Truck, title: "On its way", text: "Every seller ships separately — track each part from your orders." },
              { icon: Banknote, title: cod ? "Pay on delivery" : "Delivered", text: cod ? "Pay the courier in cash when each part arrives." : "Enjoy your purchase!" },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-3 rounded-md bg-sunken p-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-iris-50 text-primary">
                  <Icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-semibold text-fg-strong">
                    {i + 1}. {title}
                  </p>
                  <p className="mt-0.5 text-caption text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "success"; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={cn(strong && "font-bold text-fg-strong")}>{label}</dt>
      <dd className={cn("tabular-nums", tone === "success" ? "font-semibold text-success-600" : strong ? "font-bold text-fg-strong" : "text-fg-strong")}>{value}</dd>
    </div>
  );
}
