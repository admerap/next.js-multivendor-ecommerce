"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/commerce/CartProvider";
import { clearCheckoutDraft } from "./checkoutDraft";

const POLL_MS = 2500;
const GIVE_UP_MS = 90_000;

/**
 * Order confirmation, card order not paid yet: re-reads the page every few seconds until Stripe's webhook has
 * marked the order paid (the server renders the paid state, and this disappears). Never marks anything itself.
 * After 90 s it stops polling and says the order will update when the bank confirms.
 */
export function PaymentPending() {
  const router = useRouter();
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (waited >= GIVE_UP_MS) return;
    const t = window.setTimeout(() => {
      router.refresh();
      setWaited((w) => w + POLL_MS);
    }, POLL_MS);
    return () => window.clearTimeout(t);
  }, [waited, router]);

  return (
    <p role="status" className="mt-5 inline-flex items-center gap-2 text-sm text-fg-muted">
      {waited < GIVE_UP_MS ? (
        <>
          <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />
          Waiting for confirmation from your bank…
        </>
      ) : (
        "Your bank hasn't confirmed yet. This order updates by itself once it does — check My Orders in a few minutes."
      )}
    </p>
  );
}

/** Back from a payment that needed a redirect (e.g. Link): the cart and the checkout draft are spent. */
export function ClearCartOnArrival() {
  const { ready, clear } = useCart();
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    clear();
    clearCheckoutDraft();
  }, [ready, clear]);
  return null;
}
