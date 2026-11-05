"use client";

import { AlertTriangle, ArrowRight, Minus, Package, Plus, RotateCcw, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/states/Skeleton";
import { Button } from "@/components/ui/button";
import type { QuotedLine } from "@/lib/checkout";
import { money } from "@/lib/money";
import { productHref, sellerHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { useCheckoutDraft } from "./checkoutDraft";
import { CouponForm } from "./CouponForm";
import { OrderSummary } from "./OrderSummary";
import { useCartQuote } from "./useCartQuote";

const cols = "md:grid md:grid-cols-[2.4fr_1fr_1.2fr_1fr] md:items-center md:gap-3";

/**
 * Cart step (Cart Page design): lines grouped under their seller, live server prices, qty steppers, free-
 * delivery progress, and the summary with "Proceed to Shipping". Every figure comes from the
 * server quote (lib/checkout.server); the browser cart only holds ids and quantities.
 */
export function CartView() {
  const { draft, update, ready: draftReady } = useCheckoutDraft();
  const coupons = draft.coupons ?? {};
  // Tax depends on where it ships: only known here if the shopper already confirmed an address.
  const shipTo = draft.addressesConfirmed && draft.shipping ? { country: draft.shipping.country, state: draft.shipping.state ?? "" } : null;
  const { cart, quote, status, error, retry, busy } = useCartQuote(coupons, draft.shippingMethod ?? "STANDARD", shipTo, !draftReady);

  if (!cart.ready || (cart.items.length > 0 && !quote && status !== "error")) return <CartSkeleton />;
  if (cart.items.length === 0) return <EmptyCart />;
  if (!quote) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-16 text-center shadow-sm">
        <span className="grid size-19 place-items-center rounded-full bg-error-50">
          <AlertTriangle aria-hidden className="size-9 text-error-500" strokeWidth={1.6} />
        </span>
        <h2 className="font-display text-h4 font-bold text-fg-strong">Couldn&apos;t load your cart</h2>
        <p className="max-w-[380px] text-sm text-fg-muted">{error}</p>
        <Button type="button" onClick={retry}>
          <RotateCcw aria-hidden />
          Retry
        </Button>
      </div>
    );
  }

  const qtyOf = (line: QuotedLine) => cart.items.find((i) => i.id === line.id)?.qty ?? line.qty;
  const remaining = Math.max(0, quote.freeShippingThreshold - quote.subtotal);
  const progress = Math.min(100, Math.round((quote.subtotal * 100) / quote.freeShippingThreshold));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_620px] flex-col gap-5">
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-error-50 bg-error-50 px-4 py-3 text-sm text-error-600">
            <AlertTriangle aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={retry} className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-2">
              <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
              Retry
            </button>
          </div>
        )}

        <section aria-label="Items in your cart" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div aria-hidden className={cn("hidden bg-sunken px-6 py-4 text-[0.81rem] font-bold tracking-[0.04em] text-fg-muted uppercase", cols)}>
            <span>Product</span>
            <span className="text-center">Unit Price</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Total</span>
          </div>

          <div className={cn("divide-y divide-line transition-opacity duration-(--dur-fast)", busy && "opacity-70")}>
            {quote.stores.map((s) => (
              <div key={s.vendor.id || "unavailable"} className="px-5 py-5 sm:px-6">
                {/* Seller header (marketplace rule: lines grouped under their store) */}
                <p className="flex flex-wrap items-center gap-1.5 text-caption font-bold tracking-[0.04em] text-fg-muted uppercase">
                  <Store aria-hidden className="size-3.5 text-primary" strokeWidth={2.2} />
                  {s.vendor.slug ? (
                    <>
                      Sold by
                      <Link href={sellerHref(s.vendor.slug)} className="inline-flex items-center !text-primary hover:underline max-lg:min-h-11">
                        {s.vendor.name}
                      </Link>
                    </>
                  ) : (
                    s.vendor.name
                  )}
                </p>

                <ul>
                  {s.lines.map((l) => (
                    // A product that's gone can't be read any more — show the name the cart remembers.
                    <CartLine key={l.id} line={l.issue === "unavailable" ? { ...l, name: cart.items.find((i) => i.id === l.id)?.title ?? l.name } : l} qty={qtyOf(l)} onQty={(q) => cart.setQty(l.id, q)} onRemove={() => cart.remove(l.id)} />
                  ))}
                </ul>

                {s.vendor.slug && (
                  <p className="mt-1 flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 border-t border-line pt-3.5 text-[0.81rem] text-fg-muted tabular-nums">
                    {s.coupon && (
                      <span>
                        Coupon {s.coupon.code}: <b className="text-success-600">{s.coupon.freeShipping ? "Free delivery" : `− ${money(s.coupon.discount)}`}</b>
                      </span>
                    )}
                    <span>
                      Shipping: <b className="text-fg-strong">{s.shipping === 0 ? "Free" : money(s.shipping)}</b>
                    </span>
                    <span>
                      Subtotal from {s.vendor.name} <b className="ml-1.5 text-base text-fg-strong">{money(s.subtotal)}</b>
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Free delivery progress (same $75 threshold as the header promise and the mini cart) — hidden once unlocked */}
          {!quote.freeShipping && (
          <div className="border-t border-line px-5 py-4 sm:px-6">
            <p className="mb-2 flex items-center gap-2 text-[0.81rem] text-fg-muted">
              <Truck aria-hidden className={cn("size-4", quote.freeShipping ? "text-success-600" : "text-primary")} strokeWidth={2} />
              {quote.freeShipping ? (
                <span className="font-semibold text-success-600">You&apos;ve unlocked free delivery on this order.</span>
              ) : (
                <span>
                  Add <b className="text-primary tabular-nums">{money(remaining)}</b> more for free delivery
                </span>
              )}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Free delivery progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              {/* Runtime value: progress width */}
              <div className={cn("h-full rounded-full transition-[width] duration-(--dur-med)", quote.freeShipping ? "bg-success-500" : "bg-linear-to-r from-iris-500 to-primary")} style={{ width: `${progress}%` }} />
            </div>
          </div>
          )}
        </section>

      </div>

      <div className="w-full min-w-0 lg:max-w-95 lg:flex-[1_1_300px]">
        <OrderSummary
          quote={quote}
          busy={busy}
          coupon={
            <CouponForm
              quote={quote}
              lines={cart.items.map((i) => ({ id: i.id, productId: i.productId, variationId: i.variationId ?? null, qty: i.qty }))}
              coupons={coupons}
              shipTo={shipTo}
              onChange={(next) => update({ coupons: next })}
            />
          }
          actions={
            <>
              {quote.blocked ? (
                <>
                  <Button size="lg" disabled className="w-full">
                    <ArrowRight aria-hidden />
                    Proceed to Shipping
                  </Button>
                  <p className="text-center text-caption text-error-600">Remove the unavailable items above to continue.</p>
                </>
              ) : (
                <Button asChild size="lg" className={cn("w-full", busy && "pointer-events-none opacity-70")}>
                  <Link href="/checkout?step=shipping" aria-disabled={busy}>
                    <ArrowRight aria-hidden />
                    Proceed to Shipping
                  </Link>
                </Button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}

function CartLine({ line: l, qty, onQty, onRemove }: { line: QuotedLine; qty: number; onQty: (q: number) => void; onRemove: () => void }) {
  const atMin = qty <= l.minQty;
  const atMax = l.maxQty !== null && qty >= l.maxQty;
  const step = "grid size-9 place-items-center rounded-md transition-colors duration-(--dur-fast) disabled:opacity-35 max-lg:size-11";
  return (
    <li className={cn("flex flex-col gap-3 py-4", cols)}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
          {l.image ? <Image src={l.image} alt="" fill sizes="64px" className={cn("object-cover", !l.available && "opacity-50 grayscale")} /> : <Package aria-hidden className="size-7 text-iris-400" strokeWidth={1.5} />}
        </span>
        <div className="min-w-0">
          {l.slug && l.available ? (
            <Link href={productHref(l.slug)} className="line-clamp-2 text-[0.94rem] leading-snug font-semibold !text-fg-strong hover:!text-primary max-lg:py-3">
              {l.name}
            </Link>
          ) : (
            <p className="line-clamp-2 text-[0.94rem] leading-snug font-semibold text-fg-muted">{l.name}</p>
          )}
          {l.variationName && <p className="mt-0.5 text-caption text-fg-muted">{l.variationName}</p>}
          {l.message && (
            <p role="status" className={cn("mt-1 flex items-center gap-1 text-caption font-semibold", l.available ? "text-warning-600" : "text-error-600")}>
              <AlertTriangle aria-hidden className="size-3.5 shrink-0" strokeWidth={2.2} />
              {l.message}
            </p>
          )}
        </div>
      </div>

      <p className="flex items-baseline gap-2 text-[0.94rem] font-semibold text-fg-strong tabular-nums md:flex-col md:items-center md:gap-0">
        <span className="text-caption font-medium text-fg-muted md:hidden">Unit price</span>
        {l.available ? money(l.unitPrice) : "—"}
        {l.available && l.compareAt !== null && <s className="text-caption font-normal text-fg-compare">{money(l.compareAt)}</s>}
      </p>

      <div className="flex items-center gap-1 md:justify-center">
        {l.available ? (
          <>
            <button type="button" onClick={onRemove} aria-label={`Remove ${l.name} from cart`} className={cn(step, "mr-1 bg-error-50 text-error-500 hover:bg-error-500 hover:text-on-primary")}>
              <Trash2 aria-hidden className="size-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => onQty(qty - 1)} disabled={atMin} aria-label={`Decrease quantity of ${l.name}`} className={cn(step, "text-fg-muted enabled:hover:bg-iris-50 enabled:hover:text-primary")}>
              <Minus aria-hidden className="size-4" strokeWidth={2.2} />
            </button>
            <span aria-live="polite" aria-label={`Quantity ${qty}`} className="min-w-6 text-center font-bold text-fg-strong tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => onQty(qty + 1)}
              disabled={atMax}
              aria-label={atMax ? `Only ${l.maxQty} in stock` : `Increase quantity of ${l.name}`}
              title={atMax ? `Only ${l.maxQty} in stock` : undefined}
              className={cn(step, "text-primary enabled:hover:bg-iris-50")}
            >
              <Plus aria-hidden className="size-4" strokeWidth={2.2} />
            </button>
          </>
        ) : (
          <Button type="button" variant="danger" size="sm" onClick={onRemove} className="max-lg:h-11">
            <Trash2 aria-hidden />
            Remove
          </Button>
        )}
      </div>

      <p className="flex items-baseline justify-between gap-2 text-[0.94rem] font-extrabold text-fg-strong tabular-nums md:block md:text-right">
        <span className="text-caption font-medium text-fg-muted md:hidden">Total</span>
        {l.available ? money(l.subtotal) : "—"}
      </p>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-18 text-center shadow-sm">
      <span className="grid size-19 place-items-center rounded-full bg-iris-50">
        <ShoppingBag aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
      </span>
      <h2 className="font-display text-h4 font-bold text-fg-strong">Your cart is empty</h2>
      <p className="max-w-[380px] text-sm text-fg-muted">Browse products from independent sellers and add your favourites — they&apos;ll wait for you here.</p>
      <Button asChild className="mt-1.5">
        <Link href="/">
          <ShoppingBag aria-hidden />
          Start shopping
        </Link>
      </Button>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div role="status" aria-label="Loading your cart" className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_620px] flex-col gap-5">
        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-8 w-48 rounded-sm" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <Skeleton className="size-16 shrink-0 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded-sm" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Skeleton className="h-110 w-full rounded-lg lg:max-w-95 lg:flex-[1_1_300px]" />
    </div>
  );
}
