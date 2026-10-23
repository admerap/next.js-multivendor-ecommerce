"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * A cart line. Money in integer cents (CLAUDE.md §6); every line carries its store (marketplace rule:
 * the cart groups by seller, and checkout will split the order per seller).
 * `id` is the line key: the product id, or `productId:variationId` for a chosen variation.
 */
export type CartItem = {
  id: string;
  productId: string;
  variationId?: string;
  /** "Navy / M" — shown under the title */
  variationName?: string;
  title: string;
  image?: string | null;
  /** cents, per unit, as shown when it was added */
  priceCents: number;
  qty: number;
  /** stock when it was added — the stepper's upper bound (absent = no limit, e.g. digital) */
  maxQty?: number;
  store: { id: string; name: string; slug: string };
  href?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  /** Lines grouped under their store, in first-added order (marketplace rule). */
  byStore: { store: CartItem["store"]; items: CartItem[] }[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
};

const STORAGE_KEY = "sundry-cart";

const CartContext = createContext<CartContextValue | null>(null);

/** Never above the stock cap; 0 or less removes the line. */
const clampQty = (qty: number, maxQty?: number) => Math.min(Math.floor(qty), maxQty ?? Number.MAX_SAFE_INTEGER);

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as CartItem[])
      .filter((i) => i && typeof i.id === "string" && Number.isInteger(i.priceCents) && i.qty > 0 && i.store?.id)
      .map((i) => ({ ...i, productId: i.productId ?? i.id.split(":")[0]! })); // lines saved before productId existed
  } catch {
    return [];
  }
}

/**
 * Guest cart kept in this browser until the persisted Cart/CartItem models exist.
 * TODO(cart): for signed-in shoppers, sync this to the server cart and merge the guest cart on login
 * (PRD FR-S36) — the shape above maps 1:1 to CartItem rows; prices/stock are re-checked at checkout.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Hydrate after mount so server and client render the same (empty) cart first.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage
    setItems(readStored());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setItems(readStored());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [items, loaded]);

  const add = useCallback<CartContextValue["add"]>((item, qty = 1) => {
    setItems((cur) => {
      const hit = cur.find((i) => i.id === item.id);
      if (hit) return cur.map((i) => (i.id === item.id ? { ...i, ...item, qty: clampQty(i.qty + qty, item.maxQty) } : i));
      const first = clampQty(qty, item.maxQty);
      return first > 0 ? [...cur, { ...item, qty: first }] : cur;
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, clampQty(qty, i.maxQty)) } : i))));
  }, []);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);

  const value = useMemo<CartContextValue>(() => {
    const groups = new Map<string, { store: CartItem["store"]; items: CartItem[] }>();
    for (const i of items) {
      const g = groups.get(i.store.id) ?? { store: i.store, items: [] };
      g.items.push(i);
      groups.set(i.store.id, g);
    }
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      // Integer cents × integer qty: exact, no float rounding.
      subtotalCents: items.reduce((n, i) => n + i.priceCents * i.qty, 0),
      byStore: [...groups.values()],
      add,
      setQty,
      remove,
    };
  }, [items, add, setQty, remove]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
