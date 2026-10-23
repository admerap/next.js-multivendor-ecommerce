"use client";

import { Heart, Package, PackageX, RotateCcw, ShoppingCart, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { getQuickView } from "@/app/(storefront)/actions";
import { QtyStepper, VariationPickers } from "@/components/commerce/PurchaseControls";
import { StarRating } from "@/components/commerce/StarRating";
import { purchaseLabel, useProductPurchase } from "@/components/commerce/useProductPurchase";
import { useWishlist } from "@/components/commerce/wishlist";
import { Skeleton } from "@/components/states/Skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/money";
import { discountLabel, productHref, sellerHref, type QuickViewProduct } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type State = { slug: string; status: "loading" | "ready" | "missing" | "error"; product?: QuickViewProduct };
const QuickViewContext = createContext<{ open: (slug: string) => void } | null>(null);

/** Opens the quick-view modal from any product card. Null outside the storefront (cards then fall back to links). */
export const useQuickView = () => useContext(QuickViewContext);

/** Storefront-wide quick view (DESIGN_SYSTEM §5 QuickViewModal): one modal, data loaded on open. */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  // The control that opened the modal gets focus back on close (opened from code, not a Radix Trigger).
  const opener = useRef<HTMLElement | null>(null);

  const load = useCallback(async (slug: string) => {
    setState({ slug, status: "loading" });
    try {
      const res = await getQuickView(slug);
      setState((cur) => {
        if (cur?.slug !== slug) return cur; // another product was opened meanwhile
        if (!res.success) return { slug, status: "error" };
        return res.data ? { slug, status: "ready", product: res.data } : { slug, status: "missing" };
      });
    } catch {
      setState((cur) => (cur?.slug === slug ? { slug, status: "error" } : cur));
    }
  }, []);

  const value = useMemo(
    () => ({
      open: (slug: string) => {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        void load(slug);
      },
    }),
    [load],
  );

  return (
    <QuickViewContext.Provider value={value}>
      {children}
      <Dialog open={state !== null} onOpenChange={(o) => !o && setState(null)}>
        <DialogContent
          hideClose
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
          className="gap-0 p-0 sm:w-[min(920px,calc(100vw-32px))] sm:p-0"
        >
          <button
            type="button"
            onClick={() => setState(null)}
            aria-label="Close quick view"
            className="absolute top-4 right-4 z-20 grid size-9 place-items-center rounded-full border border-line bg-card text-fg-muted transition-colors duration-(--dur-fast) hover:border-error-50 hover:bg-error-50 hover:text-error-500 max-lg:size-11"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
          </button>
          {state?.status === "ready" && state.product ? (
            <QuickViewBody key={state.product.id} p={state.product} onDone={() => setState(null)} />
          ) : state?.status === "loading" ? (
            <QuickViewSkeleton />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              {state?.status === "error" ? <RotateCcw aria-hidden className="size-9 text-error-500" strokeWidth={1.6} /> : <PackageX aria-hidden className="size-9 text-fg-subtle" strokeWidth={1.6} />}
              <DialogTitle className="pr-0 text-h4">{state?.status === "error" ? "Couldn't load this product" : "This product isn't available"}</DialogTitle>
              <DialogDescription>{state?.status === "error" ? "Check your connection and try again." : "It may have sold out or been removed by its seller."}</DialogDescription>
              {state?.status === "error" && (
                <button type="button" onClick={() => load(state.slug)} className="mt-2 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover">
                  <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
                  Retry
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </QuickViewContext.Provider>
  );
}

function QuickViewSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="flex flex-wrap">
      <DialogTitle className="sr-only">Loading product</DialogTitle>
      <div className="min-w-0 flex-[1_1_360px] p-7">
        <Skeleton className="aspect-square w-full rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3 px-8 pt-10 pb-8">
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-2/3 rounded-md" />
        <Skeleton className="mt-4 h-10 w-40 rounded-md" />
        <Skeleton className="mt-auto h-13 w-full rounded-md" />
      </div>
    </div>
  );
}

function QuickViewBody({ p, onDone }: { p: QuickViewProduct; onDone: () => void }) {
  const router = useRouter();
  const wishlist = useWishlist();
  const s = useProductPurchase(p);
  const [shown, setShown] = useState(0);
  const { variation, price, compareAt, stock, images } = s;
  const main = images[Math.min(shown, images.length - 1)];

  const wished = wishlist.has(p.id);

  return (
    <div className="flex flex-wrap">
      {/* Gallery */}
      <div className="min-w-0 flex-[1_1_360px] p-5 sm:p-7">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-iris-50">
          {main ? <Image src={main} alt={p.name} fill sizes="(max-width: 720px) 90vw, 440px" className="object-cover" /> : <Package aria-hidden className="size-16 text-iris-400" strokeWidth={1.5} />}
          {p.discountPercent !== null && compareAt !== null && (
            <span className="absolute top-3.5 left-3.5 rounded-full bg-error-50 px-2 py-0.5 text-[0.72rem] font-bold text-error-600 tabular-nums">{discountLabel(p.discountPercent)}</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2.5" role="group" aria-label="Product images">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setShown(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={i === shown}
                className={cn("relative size-15 overflow-hidden rounded-md border bg-sunken", i === shown ? "border-2 border-primary" : "border-line hover:border-primary")}
              >
                <Image src={src} alt="" fill sizes="60px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-[1_1_360px] flex-col px-5 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
        <Link href={sellerHref(p.seller.slug)} onClick={onDone} className="w-fit text-sm font-semibold !text-primary hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
          {p.seller.name}
        </Link>
        <DialogTitle className="mt-2 mb-3 pr-0 text-[1.625rem] tracking-[-0.02em] text-pretty">
          <Link href={productHref(p.slug)} onClick={onDone} className="!text-fg-strong hover:!text-primary">
            {p.name}
          </Link>
        </DialogTitle>
        <div className="flex flex-wrap items-center gap-3.5 border-b border-line pb-4 text-sm text-fg-muted">
          <StarRating value={p.rating} count={p.reviewCount} />
          <span aria-hidden className="h-3.5 w-px bg-line-default" />
          <span className={cn("font-semibold", stock === 0 ? "text-error-600" : stock < 10 ? "text-warning-600" : "text-success-600")}>
            {!Number.isFinite(stock) ? "Available" : stock === 0 ? "Out of stock" : `${stock} in stock`}
          </span>
        </div>
        {p.shortDescription && <p className="mt-3.5 text-sm leading-relaxed text-fg-muted">{p.shortDescription}</p>}

        <div className="my-4.5 flex items-baseline gap-3 tabular-nums">
          <span className="font-display text-[2rem] font-extrabold text-primary">{money(price)}</span>
          {compareAt !== null && <s className="text-[1.125rem] text-fg-compare">{money(compareAt)}</s>}
        </div>

        <div className="mb-5 flex flex-col gap-4">
          <VariationPickers product={p} purchase={s} onChange={() => setShown(0)} />
          <QtyStepper purchase={s} />
        </div>
        <p className="mb-6 text-base text-fg">
          Total Price : <b className="text-[1.19rem] text-primary tabular-nums">{money(price * s.qty)}</b>
        </p>

        <div className="mt-auto flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!s.canBuy}
            onClick={() => {
              if (!s.addToCart()) return;
              onDone();
              router.push("/cart");
            }}
            className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-fg-strong transition-colors duration-(--dur-fast) hover:bg-saffron-400/90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Zap aria-hidden className="size-4" strokeWidth={2} />
            Buy now
          </button>
          <button
            type="button"
            disabled={!s.canBuy}
            onClick={() => {
              if (!s.addToCart()) return;
              toast.success(`${purchaseLabel(p, variation)} added to cart`);
              onDone();
            }}
            className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-on-primary shadow-xs transition-colors duration-(--dur-fast) hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <ShoppingCart aria-hidden className="size-4" strokeWidth={2} />
            {stock === 0 ? "Out of stock" : "Add to cart"}
          </button>
          <button
            type="button"
            onClick={() => {
              const on = wishlist.toggle(p.id);
              toast.success(on ? "Saved to your wishlist" : "Removed from your wishlist");
            }}
            aria-pressed={wished}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "inline-flex h-13 items-center gap-2 rounded-md border-[1.5px] border-line bg-card px-4.5 text-sm font-bold transition-colors duration-(--dur-fast) hover:border-error-500",
              wished ? "text-error-500" : "text-fg",
            )}
          >
            <Heart aria-hidden className={cn("size-4.5", wished && "fill-current")} strokeWidth={2} />
            {wished ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
