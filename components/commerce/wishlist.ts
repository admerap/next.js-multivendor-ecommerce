"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Guest wishlist kept in this browser (product ids). TODO(wishlist): move to the WishlistItem model for
 * signed-in shoppers (and merge this list on login) when the account wishlist page is built.
 * A tiny external store: every heart on the page and the header count read the same list.
 */
const KEY = "sundry-wishlist";
const EMPTY: string[] = [];
let ids: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function snapshot() {
  ids ??= read();
  return ids;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    ids = read();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: string[]) {
  ids = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): the list still works for this visit.
  }
  listeners.forEach((l) => l());
}

export function useWishlist() {
  const list = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const toggle = useCallback((id: string) => {
    const cur = snapshot();
    const on = !cur.includes(id);
    write(on ? [...cur, id] : cur.filter((x) => x !== id));
    return on;
  }, []);
  return { ids: list, count: list.length, has: (id: string) => list.includes(id), toggle };
}
