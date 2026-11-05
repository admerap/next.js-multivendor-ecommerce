"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { setWishlisted, syncWishlist } from "@/lib/actions/wishlist";

/**
 * The wishlist every heart on the page and the header count share (one tiny external store). It needs
 * a customer account:
 * - Signed-in customer: their account list (WishlistItem), loaded with ONE request when the storefront
 *   mounts. A heart updates the screen at once and saves on the server; a failure puts it back.
 * - Guest: tapping a heart asks them to sign in and sends them to /login; back on the same page, that
 *   product is saved automatically (?wish=<productId> rides along in the callback URL).
 * - Vendor / admin account: "Wishlists are for customer accounts".
 * Hearts saved by the older browser-only wishlist are added to the account once, on the next sign-in.
 */
const LEGACY_KEY = "sundry-wishlist";
const WISH_PARAM = "wish";
const EMPTY: string[] = [];
type Who = "unknown" | "customer" | "guest" | "staff";

let ids: string[] = EMPTY;
let who: Who = "unknown";
const listeners = new Set<() => void>();
/** Per product: the last save in flight (saves are chained so they reach the server in order). */
const queue = new Map<string, Promise<unknown>>();
/** Per product: a counter of clicks, so only the newest one settles what the heart shows. */
const latest = new Map<string, number>();

function readLegacy(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function clearLegacy() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

const emit = () => listeners.forEach((l) => l());
function set(next: string[]) {
  ids = next;
  emit();
}
const snapshot = () => ids;
const withId = (list: string[], id: string, on: boolean) => (on ? (list.includes(id) ? list : [id, ...list]) : list.filter((x) => x !== id));

/** Ask the server who's here (and load the customer's list). Runs when the first heart mounts. */
let syncing: Promise<void> | null = null;
function sync() {
  syncing ??= syncWishlist(readLegacy())
    .then((res) => {
      if (res.account) {
        clearLegacy(); // any old browser-only hearts are in the account now
        who = "customer";
        ids = res.ids;
        saveFromSignIn();
      } else {
        who = res.signedIn ? "staff" : "guest";
        ids = EMPTY;
        // A vendor / admin who signed in from the heart prompt: nothing to save — just tidy the URL.
        if (res.signedIn && takeWishParam()) toast.error("Wishlists are for customer accounts.", { id: "wish-staff" });
      }
      emit();
    })
    .catch(() => {
      // Offline / server down: hearts stay as they are; the next page load tries again.
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/**
 * Reads ?wish=<id> (set by the sign-in prompt) and flags the address bar for cleanup. The cleanup is
 * done with the Next router (see useWishlist) — a plain history.replaceState gets undone when the
 * router refreshes the page after the save.
 */
let cleanUrl = false;
function takeWishParam(): string | null {
  const id = new URL(window.location.href).searchParams.get(WISH_PARAM);
  if (id) cleanUrl = true;
  return id;
}

/** Back from /login with ?wish=<id>: save that product. */
function saveFromSignIn() {
  const id = takeWishParam();
  if (id && !ids.includes(id)) save(id, true, "Saved to your wishlist");
}

function subscribe(fn: () => void) {
  // The first heart (or header) on screen — e.g. back from /login — re-checks who's signed in.
  if (listeners.size === 0) void sync();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Customer: show the change now, save it on the server (in click order), undo it if refused. */
function save(id: string, on: boolean, message?: string) {
  const mine = (latest.get(id) ?? 0) + 1;
  latest.set(id, mine);
  const isLatest = () => latest.get(id) === mine;
  set(withId(ids, id, on));
  if (message) toast.success(message, { id: `wish-${id}` });
  const send = (queue.get(id) ?? Promise.resolve())
    .then(() => setWishlisted({ productId: id, on }))
    .catch(() => ({ ok: false as const, reason: "SERVER" as const, message: "We couldn't reach the store. Please try again." }));
  queue.set(id, send);
  void send
    .finally(() => {
      if (queue.get(id) === send) queue.delete(id);
    })
    .then((res) => {
      if (res.ok) {
        if (isLatest()) set(withId(ids, id, on)); // a sync that landed meanwhile can't undo the click
        return;
      }
      if (isLatest()) set(withId(ids, id, !on)); // put the heart back the way it was
      toast.error(res.message, { id: `wish-${id}` });
      if (res.reason === "AUTH") void sync(); // signed out meanwhile
    });
}

/**
 * The storefront header tells the store who's signed in (it re-renders on sign-in / sign-out, even when
 * it stays mounted) — when that changes, reload the list so a signed-out page never shows the previous
 * customer's hearts.
 */
let viewer: string | null | undefined;
export function useWishlistViewer(key: string | null) {
  useEffect(() => {
    if (viewer !== undefined && viewer !== key) void sync();
    viewer = key;
  }, [key]);
}

export function useWishlist() {
  const router = useRouter();
  const list = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  // Back from sign-in: drop ?wish=<id> from the address bar (once, whichever heart renders first).
  useEffect(() => {
    if (!cleanUrl) return;
    cleanUrl = false;
    const url = new URL(window.location.href);
    url.searchParams.delete(WISH_PARAM);
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }, [list, router]);

  const askToSignIn = useCallback(
    (id: string) => {
      toast("Sign in to save items to your wishlist", { id: "wish-signin", icon: "♡" });
      const back = new URL(window.location.href);
      back.searchParams.set(WISH_PARAM, id);
      router.push(`/login?callbackUrl=${encodeURIComponent(back.pathname + back.search)}`);
    },
    [router],
  );

  /** Heart: save / remove (customers), or ask to sign in (guests). Toasts are handled here. */
  const toggle = useCallback(
    (id: string) => {
      const act = () => {
        if (who === "customer") {
          const on = !ids.includes(id);
          save(id, on, on ? "Saved to your wishlist" : "Removed from your wishlist");
        } else if (who === "staff") {
          toast.error("Wishlists are for customer accounts.", { id: "wish-staff" });
        } else if (who === "guest") {
          askToSignIn(id);
        } else {
          toast.error("We couldn't reach the store. Please try again.", { id: "wish-offline" }); // first load failed
        }
      };
      // Not sure yet who's here (first load still running)? Decide once we know.
      if (who === "unknown") void (syncing ?? sync()).then(act);
      else act();
    },
    [askToSignIn],
  );

  /** Wishlist page: always removes (the page shows its own toast). */
  const remove = useCallback((id: string) => {
    if (who === "unknown") void (syncing ?? sync()).then(() => save(id, false));
    else save(id, false);
  }, []);

  return { ids: list, count: list.length, has: (id: string) => list.includes(id), toggle, remove };
}
