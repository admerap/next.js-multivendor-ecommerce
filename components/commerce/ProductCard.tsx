"use client";

import { Eye, Heart, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { useQuickView } from "@/components/commerce/QuickView";
import { StarRating } from "@/components/commerce/StarRating";
import { useWishlist } from "@/components/commerce/wishlist";
import { money } from "@/lib/money";
import { discountLabel, productHref, sellerHref, type ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/**
 * The marketplace product card (DESIGN_SYSTEM §5 ProductCard, from the design system's ProductCard):
 * square image · discount badge · wishlist · SELLER (required, links to the store) · 2-line title ·
 * rating · price + compare-at · add to cart · quick-view eye (centred on hover; always shown bottom-left
 * on touch). Hover lifts; on touch every control stays visible.
 */
export function ProductCard({ product: p, sizes = "(max-width: 720px) 50vw, (max-width: 1200px) 33vw, 240px" }: { product: ProductCardData; sizes?: string }) {
  const wishlist = useWishlist();
  const quickView = useQuickView();
  const wished = wishlist.has(p.id);

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg bg-card shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-square overflow-hidden bg-iris-50">
        <Link href={productHref(p.slug)} tabIndex={-1} aria-hidden className="absolute inset-0">
          {p.image ? (
            <Image src={p.image} alt="" fill sizes={sizes} className="object-cover transition-transform duration-(--dur-slow) group-hover:scale-[1.03] motion-reduce:transition-none" />
          ) : (
            <Package className="absolute inset-0 m-auto size-14 text-iris-400" strokeWidth={1.5} />
          )}
        </Link>
        {p.discountPercent !== null && (
          <span className="absolute top-2.5 left-2.5 z-10 inline-flex rounded-full bg-error-50 px-2 py-0.5 text-[0.72rem] font-bold text-error-600 tabular-nums">
            {discountLabel(p.discountPercent)}
          </span>
        )}
        {quickView && (
          <button
            type="button"
            onClick={() => quickView.open(p.slug)}
            aria-label={`Quick view: ${p.name}`}
            className="absolute z-10 grid place-items-center rounded-full bg-primary text-on-primary shadow-primary transition-[opacity,transform,background-color] duration-(--dur-med) ease-out hover:bg-primary-hover focus-visible:opacity-100 lg:top-1/2 lg:left-1/2 lg:size-12 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:scale-90 lg:opacity-0 lg:group-hover:scale-100 lg:group-hover:opacity-100 lg:focus-visible:scale-100 max-lg:bottom-2.5 max-lg:left-2.5 max-lg:size-11"
          >
            <Eye aria-hidden className="size-5" strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const on = wishlist.toggle(p.id);
            toast.success(on ? "Saved to your wishlist" : "Removed from your wishlist");
          }}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 grid size-8.5 place-items-center rounded-full bg-card/85 shadow-xs backdrop-blur-[6px] transition-colors duration-(--dur-fast) max-lg:size-11",
            wished ? "text-error-500" : "text-fg-muted hover:text-error-500",
          )}
        >
          <Heart aria-hidden className={cn("size-4", wished && "fill-current")} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <Link href={sellerHref(p.seller.slug)} className="mb-1 inline-flex w-fit max-w-full truncate text-[0.69rem] font-semibold !text-primary hover:underline max-lg:min-h-11 max-lg:items-center">
          {p.seller.name}
        </Link>
        <h3 className="mb-2 min-h-[2.6em] text-sm leading-[1.3] font-semibold">
          {/* ≥44px tap target on touch; the text itself stays clamped to 2 lines. */}
          <Link href={productHref(p.slug)} className="block !text-fg-strong hover:!text-primary max-lg:flex max-lg:min-h-11 max-lg:items-start" title={p.name}>
            <span className="line-clamp-2">{p.name}</span>
          </Link>
        </h3>
        <StarRating value={p.rating} count={p.reviewCount} className="mb-2.5" />
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col leading-[1.15] tabular-nums">
            <span className="text-[0.94rem] font-extrabold text-fg-strong">{money(p.price)}</span>
            {p.compareAt !== null && <s className="text-caption text-fg-compare">{money(p.compareAt)}</s>}
          </div>
          <AddToCartButton product={p} />
        </div>
      </div>
    </article>
  );
}
