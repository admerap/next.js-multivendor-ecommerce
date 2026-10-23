"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/components/commerce/CartProvider";
import { productHref, type QuickViewProduct, type QuickViewVariation } from "@/lib/storefront";

/** First in-stock variation (else the first one) → the initially selected attributes. */
function initialPick(p: QuickViewProduct): Record<string, string> {
  const v = p.variations.find((x) => x.stock > 0) ?? p.variations[0];
  return v ? { ...v.attributes } : {};
}

const matches = (v: QuickViewVariation, pick: Record<string, string>) => Object.entries(pick).every(([k, val]) => v.attributes[k] === val);

/**
 * Buying state shared by the product page and the quick-view modal: the chosen variation (one value per
 * option), its price / compare-at / stock / photo, the quantity (min order ↔ stock) and add-to-cart.
 * All money is integer cents. Products without variations use the product's own price and stock.
 */
export function useProductPurchase(p: QuickViewProduct) {
  const cart = useCart();
  const [pick, setPick] = useState<Record<string, string>>(() => initialPick(p));
  const [qty, setQty] = useState(Math.max(1, p.minOrderQty));

  const hasVariations = p.variations.length > 0;
  // Every option chosen and that exact combination exists → a variation; otherwise null.
  const variation = hasVariations ? (p.variations.find((v) => matches(v, pick) && p.options.every((o) => pick[o.name])) ?? null) : null;

  const price = variation?.price ?? p.price;
  const compareAt = variation ? variation.compareAt : p.compareAt;
  const stock = hasVariations ? (variation?.stock ?? 0) : (p.stock ?? Infinity); // null stock = digital, no limit
  const minQty = Math.max(1, p.minOrderQty);
  const maxQty = Number.isFinite(stock) ? stock : 99;
  const qtySafe = Math.min(Math.max(qty, minQty), Math.max(minQty, maxQty));
  const canBuy = (!hasVariations || variation !== null) && stock >= minQty;

  // Gallery: the chosen variation's own picture first, then the product images.
  const images = useMemo(() => [...new Set([variation?.image, ...p.images].filter((x): x is string => !!x))], [variation?.image, p.images]);

  /** Some in-stock variation has this value — otherwise the value is sold out in every combination. */
  const inStockAnywhere = (option: string, value: string) => p.variations.some((v) => v.stock > 0 && v.attributes[option] === value);
  /** In stock together with the other current choices (picking it won't change them). */
  const fitsPick = (option: string, value: string) => p.variations.some((v) => v.stock > 0 && matches(v, { ...pick, [option]: value }));

  /** Pick a value; if that combination is sold out, move the other options to the first in-stock one that has it. */
  function choose(option: string, value: string) {
    if (fitsPick(option, value)) return setPick((cur) => ({ ...cur, [option]: value }));
    const v = p.variations.find((x) => x.stock > 0 && x.attributes[option] === value);
    setPick(v ? { ...v.attributes } : (cur) => ({ ...cur, [option]: value }));
  }

  /** Adds the chosen variation × qty to the shared cart. False (with a message) when it can't. */
  function addToCart(): boolean {
    if (!canBuy) return false;
    const id = variation ? `${p.id}:${variation.id}` : p.id;
    const inCart = cart.items.find((i) => i.id === id)?.qty ?? 0;
    if (Number.isFinite(stock) && inCart + qtySafe > stock) {
      const left = stock - inCart;
      toast.error(left > 0 ? `Only ${left} more available` : `Only ${stock} in stock — they're all in your cart`);
      return false;
    }
    cart.add(
      {
        id,
        productId: p.id,
        variationId: variation?.id,
        variationName: variation?.name,
        title: p.name,
        image: variation?.image ?? p.image,
        priceCents: price,
        maxQty: Number.isFinite(stock) ? stock : undefined,
        store: { id: p.seller.id, name: p.seller.name, slug: p.seller.slug },
        href: productHref(p.slug),
      },
      qtySafe,
    );
    return true;
  }

  return { pick, choose, inStockAnywhere, fitsPick, variation, price, compareAt, stock, minQty, maxQty, qty: qtySafe, setQty, canBuy, images, addToCart };
}

/** "Maple Tee (Black / M)" — the toast / label name of what was added. */
export const purchaseLabel = (p: QuickViewProduct, v: QuickViewVariation | null) => (v ? `${p.name} (${v.name})` : p.name);
