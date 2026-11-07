// "/pure": the default entry injects Stripe.js into every page that imports it; this one waits for loadStripe().
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

/**
 * Stripe.js in the browser, loaded once and only when the shopper picks Card. Uses the PUBLISHABLE key only —
 * the secret key lives in lib/stripe.server.ts and can't be imported here (server-only).
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  // A failed load (offline, blocked script) is forgotten so "Retry" can load it again.
  stripePromise ??= loadStripe(key).catch((error: unknown) => {
    stripePromise = null;
    throw error;
  });
  return stripePromise;
}

/** Stripe can't charge less than $0.50 (USD) — below that the Card option is unavailable. */
export const STRIPE_MIN_CENTS = 50;
