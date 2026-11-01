"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShippingMethod } from "@/lib/checkout";
import type { AddressInput } from "@/lib/validations/checkout";

/**
 * What the shopper has typed during checkout (order note, store coupons; addresses in the Shipping step), kept in
 * this browser so moving between steps or refreshing doesn't lose it. Nothing here is trusted: the
 * server re-validates everything when the order is placed. Cleared after the order.
 */
export type CheckoutDraft = {
  note?: string;
  /** vendorId → coupon code applied for that store (re-validated by the server on every quote) */
  coupons?: Record<string, string>;
  shipping?: AddressInput;
  /** billing = shipping (default) */
  billingSame?: boolean;
  billing?: AddressInput;
  /** delivery speed for the whole order (Standard when unset) */
  shippingMethod?: ShippingMethod;
  /** set when the server accepted the addresses (Proceed to Payment); any edit clears it */
  addressesConfirmed?: boolean;
};

const KEY = "sundry-checkout";

function read(): CheckoutDraft {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? (v as CheckoutDraft) : {};
  } catch {
    return {};
  }
}

export function useCheckoutDraft() {
  const [draft, setDraft] = useState<CheckoutDraft>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage
    setDraft(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<CheckoutDraft>) => {
    setDraft((cur) => {
      const next = { ...cur, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode) — the draft still works for this visit
      }
      return next;
    });
  }, []);

  return { draft, update, ready };
}

/** Forget the draft (after the order is placed). */
export function clearCheckoutDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
