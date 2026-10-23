"use client";

import { Heart, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { QtyStepper, VariationPickers } from "@/components/commerce/PurchaseControls";
import { StarRating } from "@/components/commerce/StarRating";
import { purchaseLabel, useProductPurchase } from "@/components/commerce/useProductPurchase";
import { useWishlist } from "@/components/commerce/wishlist";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";
import { discountLabel, sellerHref, type QuickViewProduct } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { ProductGallery } from "./ProductGallery";

/**
 * Product card of the details page (Product Detail Page design): gallery on the left; info, variation
 * pickers, quantity, total and Buy now / Add to cart / wishlist on the right. Choosing a variation updates
 * the price, stock and photo; add-to-cart puts that exact variation in the shared cart.
 */
export function ProductHero({ product: p }: { product: QuickViewProduct }) {
  const router = useRouter();
  const wishlist = useWishlist();
  const s = useProductPurchase(p);
  const [shown, setShown] = useState(0);

  const soldOut = Number.isFinite(s.stock) && s.stock < s.minQty;
  const unavailable = p.variations.length > 0 && s.variation === null;
  const wished = wishlist.has(p.id);
  const off = s.compareAt !== null && s.compareAt > s.price ? Math.round(((s.compareAt - s.price) * 100) / s.compareAt) : null;

  return (
    <div className="flex flex-wrap gap-8 rounded-lg bg-card p-5 shadow-sm sm:p-7">
      <ProductGallery images={s.images} name={p.name} badge={off !== null ? discountLabel(off) : null} shown={shown} onShow={setShown} />

      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
        <div>
          {/* Marketplace rule: the seller is always shown and links to the store. */}
          <Link href={sellerHref(p.seller.slug)} className="text-sm font-semibold !text-primary hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
            {p.seller.name}
          </Link>
          <h1 className="mt-1.5 font-display text-[1.625rem] leading-tight font-extrabold tracking-[-0.02em] text-pretty text-fg-strong">{p.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-sm text-fg">
          <StarRating value={p.rating} size="lg" />
          {p.reviewCount > 0 && <span className="font-semibold text-fg-strong tabular-nums">({p.rating.toFixed(2)})</span>}
          <span aria-hidden className="h-3.5 w-px bg-line-default" />
          <a href="#reviews" className="!text-fg hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
            <b className="text-fg-strong tabular-nums">{p.reviewCount}</b> {p.reviewCount === 1 ? "Review" : "Reviews"}
          </a>
          <span aria-hidden className="h-3.5 w-px bg-line-default" />
          <span aria-live="polite" className={cn("font-semibold", unavailable || s.stock === 0 ? "text-error-600" : s.stock < 10 ? "text-warning-600" : "text-success-600")}>
            {unavailable ? "Unavailable" : !Number.isFinite(s.stock) ? "Available" : s.stock === 0 ? "Out of stock" : `${s.stock} in stock`}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-3 tabular-nums" aria-live="polite">
          {s.compareAt !== null && (
            <s className="text-lg text-fg-compare">
              <span className="sr-only">Was </span>
              {money(s.compareAt)}
            </s>
          )}
          <span className="font-display text-h2 font-extrabold text-primary">
            {s.compareAt !== null && <span className="sr-only">Now </span>}
            {money(s.price)}
          </span>
        </div>

        {p.shortDescription && <p className="text-sm leading-relaxed text-fg-muted">{p.shortDescription}</p>}
        <div aria-hidden className="h-px bg-line" />

        <VariationPickers product={p} purchase={s} onChange={() => setShown(0)} />

        <div>
          <p className="mb-2.5 text-[0.81rem] font-bold text-fg-strong">Qty</p>
          <QtyStepper purchase={s} />
        </div>

        <p className="text-base text-fg">
          Total Price : <b className="text-[1.3rem] font-extrabold text-primary tabular-nums">{money(s.price * s.qty)}</b>
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="lg"
            disabled={!s.canBuy}
            onClick={() => {
              if (s.addToCart()) router.push("/cart");
            }}
            className="flex-1 sm:flex-none"
          >
            <Zap aria-hidden />
            Buy now
          </Button>
          <Button
            size="lg"
            disabled={!s.canBuy}
            onClick={() => {
              if (s.addToCart()) toast.success(`${purchaseLabel(p, s.variation)} added to cart`);
            }}
            className="flex-1 sm:flex-none"
          >
            <ShoppingCart aria-hidden />
            {unavailable ? "Unavailable" : soldOut ? "Out of stock" : "Add to cart"}
          </Button>
          <button
            type="button"
            onClick={() => toast.success(wishlist.toggle(p.id) ? "Saved to your wishlist" : "Removed from your wishlist")}
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
