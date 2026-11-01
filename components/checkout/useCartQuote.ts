"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getCartQuote } from "@/app/(storefront)/cart/actions";
import { useCart } from "@/components/commerce/CartProvider";
import type { CartQuote, ShippingMethod } from "@/lib/checkout";

const DEBOUNCE_MS = 250;

/**
 * Server quote of the browser cart, refreshed whenever the cart changes (debounced; out-of-order replies
 * are dropped). After each quote the cart is synced to it — live unit price, stock cap, adjusted
 * quantity — so the header cart and this page always agree with what the order would charge.
 */
export function useCartQuote(coupons: Record<string, string> = {}, shippingMethod: ShippingMethod = "STANDARD") {
  const cart = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const { sync } = cart;

  // Only what the server needs; prices in the browser are ignored on purpose.
  const lines = useMemo(() => cart.items.map((i) => ({ id: i.id, productId: i.productId, variationId: i.variationId ?? null, qty: i.qty })), [cart.items]);
  const key = JSON.stringify({ lines, coupons, shippingMethod });

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setStatus("loading");
    const payload: { lines: { id: string; qty: number }[]; coupons: Record<string, string>; shippingMethod: ShippingMethod } = JSON.parse(key);
    const requested = payload.lines;
    const res = await getCartQuote(payload).catch(() => ({ success: false as const, error: "We couldn't load your cart totals. Check your connection and try again." }));
    if (mine !== seq.current) return; // a newer request is on its way
    if (!res.success) {
      setError(res.error);
      setStatus("error");
      return;
    }
    setQuote(res.data);
    setError(null);
    setStatus("ready");
    // The quote line keeps its message only until the cart is synced — say it once, out loud.
    for (const l of res.data.stores.flatMap((st) => st.lines)) {
      const had = requested.find((i) => i.id === l.id)?.qty;
      if (l.available && l.message && had !== undefined && had !== l.qty) toast(`${l.name}: ${l.message}`, { id: `qty-${l.id}` });
    }
    sync(
      res.data.stores.flatMap((s) =>
        s.lines.filter((l) => l.available).map((l) => ({ id: l.id, priceCents: l.unitPrice, maxQty: l.maxQty, qty: l.qty })),
      ),
    );
  }, [key, sync]);

  useEffect(() => {
    if (!cart.ready) return;
    if (lines.length === 0) {
      seq.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- an empty cart needs no server round-trip
      setQuote(null);
      setStatus("ready");
      return;
    }
    const t = setTimeout(load, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cart.ready, lines.length, load]);

  return { cart, quote, status, error, retry: load, busy: status === "loading" && quote !== null };
}
