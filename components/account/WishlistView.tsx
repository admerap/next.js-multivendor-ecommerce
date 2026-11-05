"use client";

import { Heart, Package, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { StarRating } from "@/components/commerce/StarRating";
import { useWishlist } from "@/components/commerce/wishlist";
import { EmptyState } from "@/components/data/DashCard";
import { Skeleton } from "@/components/states/Skeleton";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { money } from "@/lib/money";
import { discountLabel, productHref, sellerHref, type ProductCardData } from "@/lib/storefront";

export type WishlistRow =
  | { available: true; product: ProductCardData; brand: string | null }
  | { available: false; id: string; name: string; image: string | null; sellerName: string };

const idOf = (r: WishlistRow) => (r.available ? r.product.id : r.id);

const emptyState = (
  <EmptyState bare icon={Heart} title="Your wishlist is empty" description="Tap the heart on any product to save it here for later.">
    <Link href="/" className={buttonClasses.primary}>
      <ShoppingBag aria-hidden className="size-4" strokeWidth={2} />
      Browse products
    </Link>
  </EmptyState>
);

export function WishlistSkeleton() {
  return (
    <ul role="status" aria-label="Loading your wishlist" className="flex flex-col gap-3.5">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-4">
          <Skeleton className="size-20 shrink-0 rounded-md" />
          <div className="flex min-w-40 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-56 max-w-full rounded-sm" />
            <Skeleton className="h-3.5 w-32 rounded-sm" />
            <Skeleton className="h-3.5 w-40 rounded-sm" />
          </div>
          <Skeleton className="h-11 w-36 rounded-md" />
          <Skeleton className="size-11 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Wish List (userwishlist design): the customer's saved products — image, name, brand, seller (links to
 * the store), rating, price / compare-at / discount, Add to Cart and the red heart to remove. Removing
 * uses the same wishlist store as every heart on the site, so the header count and product cards
 * follow at once; if the server refuses, the item comes back.
 */
export function WishlistView({ rows }: { rows: WishlistRow[] }) {
  const wishlist = useWishlist();
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  // Hidden once removed — unless the store put it back (the save failed).
  const shown = rows.filter((r) => !(removed.has(idOf(r)) && !wishlist.has(idOf(r))));

  function remove(r: WishlistRow) {
    const id = idOf(r);
    setRemoved((s) => new Set(s).add(id));
    wishlist.remove(id);
    toast.success(`Removed ${r.available ? r.product.name : r.name} from your wishlist`);
  }

  const heart = (r: WishlistRow) => (
    <button
      type="button"
      onClick={() => remove(r)}
      aria-label={`Remove ${r.available ? r.product.name : r.name} from wishlist`}
      title="Remove from wishlist"
      className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-card text-error-500 transition-colors duration-(--dur-fast) hover:border-error-500 hover:bg-error-50"
    >
      <Heart aria-hidden className="size-5 fill-current" strokeWidth={2} />
    </button>
  );

  return (
    <PreviewStateFrame
      className="mb-5 flex flex-wrap items-center justify-between gap-4"
      heading={
        <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">
          Wishlist <span className="text-fg-subtle tabular-nums">({shown.length})</span>
        </h1>
      }
      errorCard={false}
      loading={<WishlistSkeleton />}
      empty={emptyState}
      error={{ title: "Couldn't load your wishlist", description: "Something went wrong. Please try again." }}
    >
      {shown.length === 0 ? (
        emptyState
      ) : (
        <ul className="flex flex-col gap-3.5">
          {shown.map((r) =>
            r.available ? (
              <li key={r.product.id} aria-label={r.product.name} className="flex items-center gap-4 rounded-lg border border-line p-4 max-md:flex-col max-md:items-stretch">
                <div className="flex min-w-0 flex-1 items-center gap-4 max-md:items-start">
                  <Link href={productHref(r.product.slug)} aria-hidden tabIndex={-1} className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-sunken">
                    {r.product.image ? <Image src={r.product.image} alt="" fill sizes="80px" className="object-cover" /> : <Package className="size-8 text-iris-400" strokeWidth={1.5} />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={productHref(r.product.slug)} className="line-clamp-2 font-semibold !text-fg-strong hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                      {r.product.name}
                    </Link>
                    {r.brand && (
                      <p className="text-caption text-fg-muted">
                        Brand : <span className="font-semibold text-primary">{r.brand}</span>
                      </p>
                    )}
                    <p className="text-caption text-fg-muted">
                      Sold by{" "}
                      <Link href={sellerHref(r.product.seller.slug)} className="font-semibold !text-primary hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
                        {r.product.seller.name}
                      </Link>
                    </p>
                    <StarRating value={r.product.rating} count={r.product.reviewCount} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-4 max-md:flex-wrap max-md:justify-between">
                  <div className="text-right leading-tight tabular-nums max-md:text-left">
                    <p className="text-lg font-extrabold text-fg-strong">{money(r.product.price)}</p>
                    {r.product.compareAt !== null && (
                      <p className="flex items-center justify-end gap-2 text-caption max-md:justify-start">
                        <s className="text-fg-compare">{money(r.product.compareAt)}</s>
                        {r.product.discountPercent !== null && <span className="rounded-sm bg-error-50 px-1.5 py-0.5 font-bold text-error-600">{discountLabel(r.product.discountPercent)}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <AddToCartButton product={r.product} variant="block" label="Add to Cart" className="w-auto max-md:flex-1" />
                    {heart(r)}
                  </div>
                </div>
              </li>
            ) : (
              <li key={r.id} aria-label={r.name} className="flex items-center gap-4 rounded-lg border border-dashed border-line-default bg-sunken p-4">
                <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-card">
                  {r.image ? <Image src={r.image} alt="" fill sizes="80px" className="object-cover opacity-50 grayscale" /> : <Package aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.5} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold text-fg-muted">{r.name}</p>
                  <p className="text-caption text-fg-muted">Sold by {r.sellerName}</p>
                  <p className="mt-1 text-caption font-semibold text-warning-600">No longer available</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r)}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-semibold text-fg transition-colors duration-(--dur-fast) hover:border-error-500 hover:text-error-600"
                  aria-label={`Remove ${r.name} from wishlist`}
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={2} />
                  <span className="max-sm:sr-only">Remove</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </PreviewStateFrame>
  );
}
