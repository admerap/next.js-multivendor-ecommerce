"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** A cart line. Money in integer cents (CLAUDE.md §6); every line carries its store. */
export type CartItem = {
  id: string;
  title: string;
  priceCents: number;
  qty: number;
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

/** Free-shipping threshold shown in the MiniCart ("Free shipping on orders over $75"). */
export const FREE_SHIPPING_CENTS = 75_00;
const STORAGE_KEY = "sundry-cart";

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.id === "string" && i.qty > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Guest cart kept in this browser until the persisted Cart/CartItem models exist
 * (then signed-in carts move server-side and the guest cart merges on login, PRD FR-S36).
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
      return hit ? cur.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i)) : [...cur, { ...item, qty }];
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty } : i))));
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
