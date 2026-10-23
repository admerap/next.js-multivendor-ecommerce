"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCart } from "@/components/commerce/CartProvider";
import { useQuickView } from "@/components/commerce/QuickView";
import { productHref, type ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/**
 * Add-to-cart for any product card. A product with variations can't be added blind: the button opens
 * the quick-view modal to choose one (or the product page outside the storefront, where there's no modal).
 * `variant="icon"`: the 36px cart square of ProductCard. `variant="block"`: full-width labelled button.
 */
export function AddToCartButton({ product: p, variant = "icon", label = "Add to cart", className }: { product: ProductCardData; variant?: "icon" | "block"; label?: string; className?: string }) {
  const cart = useCart();
  const quickView = useQuickView();
  const base =
    variant === "icon"
      ? "grid size-9 shrink-0 place-items-center rounded-md bg-primary !text-on-primary shadow-xs transition-colors duration-(--dur-fast) hover:bg-primary-hover max-lg:size-11"
      : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold !text-on-primary shadow-xs transition-colors duration-(--dur-fast) hover:bg-primary-hover";
  const icon = <ShoppingCart aria-hidden className="size-4" strokeWidth={2} />;

  if (!p.inStock) {
    return variant === "icon" ? (
      <span className={cn("text-caption font-semibold text-error-600", className)}>Out of stock</span>
    ) : (
      <span className={cn(base, "pointer-events-none bg-sunken !text-fg-muted shadow-none", className)}>Out of stock</span>
    );
  }

  if (p.hasVariations && quickView) {
    return (
      <button type="button" onClick={() => quickView.open(p.slug)} aria-label={variant === "icon" ? `Choose options for ${p.name}` : undefined} title="Choose options" className={cn(base, className)}>
        {icon}
        {variant === "block" && "Choose options"}
      </button>
    );
  }

  if (p.hasVariations) {
    return (
      <Link href={productHref(p.slug)} aria-label={variant === "icon" ? `Choose options for ${p.name}` : undefined} title="Choose options" className={cn(base, className)}>
        {icon}
        {variant === "block" && "Choose options"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const inCart = cart.items.find((i) => i.id === p.id)?.qty ?? 0;
        if (p.stock !== null && inCart >= p.stock) {
          toast.error(`Only ${p.stock} in stock — they're all in your cart`);
          return;
        }
        cart.add({
          id: p.id,
          productId: p.id,
          title: p.name,
          image: p.image,
          priceCents: p.price,
          maxQty: p.stock ?? undefined,
          store: { id: p.seller.id, name: p.seller.name, slug: p.seller.slug },
          href: productHref(p.slug),
        });
        toast.success(`${p.name} added to cart`);
      }}
      aria-label={variant === "icon" ? `Add ${p.name} to cart` : undefined}
      title={variant === "icon" ? label : undefined}
      className={cn(base, className)}
    >
      {icon}
      {variant === "block" && label}
    </button>
  );
}
