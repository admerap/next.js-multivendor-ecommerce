"use client";

import { BadgeCheck, ChevronRight, Minus, Package, Plus, ShoppingBag, ShoppingCart, Store, Trash2, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { FREE_SHIPPING_CENTS } from "@/lib/storefront";
import { useCart } from "./CartProvider";

/**
 * MiniCart popover (DESIGN_SYSTEM §5): items grouped under their seller, product photo + variation,
 * unit price × qty, qty stepper (capped at stock), remove, free-shipping bar, subtotal (integer cents).
 */
export function MiniCart({ onClose }: { onClose: () => void }) {
  const { byStore, count, subtotalCents, setQty, remove } = useCart();
  const remaining = Math.max(0, FREE_SHIPPING_CENTS - subtotalCents);
  const progress = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_CENTS) * 100));
  const unlocked = remaining === 0;

  return (
    <div
      role="dialog"
      aria-label="Shopping cart"
      className="flex max-h-[calc(100dvh-96px)] w-full flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl sm:w-[404px]"
    >
      <div className="flex items-center justify-between bg-linear-120 from-iris-50 to-card px-5 py-4">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8.5 place-items-center rounded-md bg-primary shadow-primary">
            <ShoppingCart aria-hidden className="size-4.5 text-on-primary" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-fg-strong">Shopping Cart</span>
          <span className="rounded-full bg-iris-50 px-2.5 py-0.5 text-caption font-bold text-primary tabular-nums">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="grid size-9 place-items-center rounded-full border border-line bg-card text-fg-muted transition-colors duration-(--dur-fast) hover:border-error-50 hover:bg-error-50 hover:text-error-500 max-lg:size-11"
        >
          <X aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-19 place-items-center rounded-full bg-iris-50">
            <ShoppingBag aria-hidden className="size-9 text-iris-400" strokeWidth={1.6} />
          </span>
          <h3 className="font-display text-h4 font-bold text-fg-strong">Your cart is empty</h3>
          <p className="max-w-[300px] text-sm text-fg-muted">
            Browse thousands of independent sellers and add something you love.
          </p>
          <Link href="/" onClick={onClose} className={cn(buttonClasses.primary, "mt-1")}>
            <Store aria-hidden className="size-4" strokeWidth={2} />
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-col p-5">
          {/* Free-shipping progress: turns success-green at the threshold */}
          <div className="mb-4">
            <p className={cn("mb-2 flex items-center gap-2 text-caption font-semibold", unlocked ? "text-success-600" : "text-fg")}>
              <Truck aria-hidden className="size-4" strokeWidth={2} />
              {unlocked ? "You've unlocked free shipping" : <>Add <b className="tabular-nums">{money(remaining)}</b> more for free shipping</>}
            </p>
            <div
              role="progressbar"
              aria-label="Progress to free shipping"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded-full bg-sunken"
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-(--dur-med) ease-out", unlocked ? "bg-success-500" : "bg-primary")}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="-mx-2 mb-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
            {byStore.map(({ store, items }) => (
              <section key={store.id} aria-label={store.name} className="mb-4">
                <Link
                  href={`/vendors/${store.slug}`}
                  onClick={onClose}
                  className="mb-2 flex items-center gap-1.5 text-caption font-bold max-lg:min-h-11"
                >
                  <Store aria-hidden className="size-3.5" strokeWidth={2} />
                  {store.name}
                  <BadgeCheck aria-label="Verified seller" className="size-3.5 text-primary" strokeWidth={2} />
                </Link>
                <ul className="flex flex-col gap-3">
                  {items.map((it) => {
                    const atMax = it.maxQty !== undefined && it.qty >= it.maxQty;
                    return (
                      <li key={it.id} className="flex gap-3 rounded-lg bg-sunken p-3">
                        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
                          {it.image ? (
                            <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />
                          ) : (
                            <Package aria-hidden className="size-7 text-iris-400" strokeWidth={1.5} />
                          )}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          {it.href ? (
                            <Link href={it.href} onClick={onClose} className="text-sm leading-snug font-semibold !text-fg-strong hover:!text-primary max-lg:flex max-lg:min-h-11 max-lg:items-center">
                              <span className="line-clamp-2">{it.title}</span>
                            </Link>
                          ) : (
                            <p className="line-clamp-2 text-sm leading-snug font-semibold text-fg-strong">{it.title}</p>
                          )}
                          {it.variationName && <p className="mt-0.5 text-caption text-fg-muted">{it.variationName}</p>}
                          <p className="mt-1 text-caption text-fg-muted tabular-nums">
                            {money(it.priceCents)} × {it.qty}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-md border border-line bg-card" role="group" aria-label={`Quantity of ${it.title}`}>
                              <button
                                type="button"
                                onClick={() => setQty(it.id, it.qty - 1)}
                                disabled={it.qty <= 1}
                                aria-label={`Decrease quantity of ${it.title}`}
                                className="grid size-8 place-items-center rounded-l-md text-fg hover:bg-iris-50 disabled:opacity-35 max-lg:size-11"
                              >
                                <Minus aria-hidden className="size-3.5" strokeWidth={2.2} />
                              </button>
                              <span className="min-w-8 text-center text-caption font-bold text-fg-strong tabular-nums" aria-live="polite">
                                {it.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(it.id, it.qty + 1)}
                                disabled={atMax}
                                aria-label={atMax ? `Only ${it.maxQty} in stock` : `Increase quantity of ${it.title}`}
                                title={atMax ? `Only ${it.maxQty} in stock` : undefined}
                                className="grid size-8 place-items-center rounded-r-md text-primary hover:bg-iris-50 disabled:opacity-35 max-lg:size-11"
                              >
                                <Plus aria-hidden className="size-3.5" strokeWidth={2.2} />
                              </button>
                            </div>
                            <b className="text-[0.9rem] font-extrabold text-fg-strong tabular-nums">{money(it.priceCents * it.qty)}</b>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(it.id)}
                          aria-label={`Remove ${it.title}${it.variationName ? ` (${it.variationName})` : ""} from cart`}
                          className="grid size-8 shrink-0 place-items-center self-start rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-error-50 hover:text-error-500 max-lg:size-11"
                        >
                          <Trash2 aria-hidden className="size-4" strokeWidth={2} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-[0.9rem] text-fg">Subtotal</span>
            <b className="text-[1.15rem] font-extrabold text-primary tabular-nums">{money(subtotalCents)}</b>
          </div>
          <div className="flex items-stretch gap-2.5">
            <Link
              href="/cart"
              onClick={onClose}
              className="flex min-h-11 items-center gap-1 rounded-md border border-line px-3 text-caption sm:px-4 font-semibold whitespace-nowrap !text-fg transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary"
            >
              Expand cart
              <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
            </Link>
            <Link href="/checkout" onClick={onClose} className={cn(buttonClasses.primary, "h-13 flex-1 px-3 whitespace-nowrap sm:px-5")}>
              <ShoppingCart aria-hidden className="size-4" strokeWidth={2} />
              Proceed To Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
