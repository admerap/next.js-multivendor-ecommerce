"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Appearance, Stripe, StripeElements, StripeElementsOptions, StripePaymentElementChangeEvent } from "@stripe/stripe-js";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import { Skeleton } from "@/components/states/Skeleton";
import { getStripe } from "@/lib/stripe.client";

/**
 * Card payment (Stripe Payment Element) for the checkout's Payment step. Card numbers are typed into Stripe's own
 * iframe — they never touch Sundry's servers (PCI stays with Stripe).
 *
 * <StripeCheckout> wraps the Payment step in Stripe's <Elements> in "deferred" mode: the form shows the order's
 * total before any PaymentIntent exists; the order and its PaymentIntent are created when Place Order is pressed.
 * Stripe.js is only downloaded once `active` (the shopper picked Card).
 */

/** Sundry design tokens → Stripe's appearance. Stripe's iframe can't read our CSS variables, so each token is
 * resolved to its computed colour here (a probe element) — no colour is hard-coded. */
function tokenAppearance(): Appearance {
  const probe = document.createElement("span");
  document.body.appendChild(probe);
  const color = (token: string) => {
    probe.style.color = `var(${token})`;
    return getComputedStyle(probe).color;
  };
  const root = getComputedStyle(document.documentElement);
  const appearance: Appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: color("--color-primary"),
      colorBackground: color("--surface-card"),
      colorText: color("--text-strong"),
      colorTextSecondary: color("--text-muted"),
      colorTextPlaceholder: color("--text-subtle"),
      colorDanger: color("--color-error-600"),
      borderRadius: root.getPropertyValue("--radius-md").trim() || undefined,
      fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSizeBase: "15px",
    },
    rules: {
      ".Input": { borderColor: color("--border-subtle"), boxShadow: "none" },
      ".Input:focus": { borderColor: color("--color-primary"), boxShadow: `0 0 0 1px ${color("--color-primary")}` },
      ".Tab": { borderColor: color("--border-subtle"), boxShadow: "none" },
      ".Tab--selected": { borderColor: color("--color-primary"), boxShadow: `0 0 0 1px ${color("--color-primary")}` },
      ".Label": { fontWeight: "600", color: color("--text-body") },
    },
  };
  probe.remove();
  return appearance;
}

export function StripeCheckout({ active, amount, children }: { active: boolean; amount: number; children: ReactNode }) {
  // `stripe` may start as null and be set once — Stripe.js loads the first time Card is chosen.
  // Once set it stays (Elements doesn't allow swapping it), so going back to COD and to Card again is instant.
  const [stripe, setStripe] = useState<ReturnType<typeof getStripe> | null>(null);
  if (active && !stripe) setStripe(getStripe());
  // Only ever non-null in the browser (after the shopper picked Card), so reading the DOM here is safe.
  const appearance = useMemo(() => (stripe ? tokenAppearance() : undefined), [stripe]);

  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      currency: "usd",
      locale: "en", // the storefront is in English; Stripe would otherwise follow the browser's language
      // Which methods show (card, Link, wallets…) is set in the Stripe Dashboard › Settings › Payment methods —
      // the current Stripe API no longer takes a list from code.
      amount, // cents — display only; the server sets what is charged
      appearance,
      fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" }],
    }),
    [amount, appearance],
  );

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
}

export type CardApi = { stripe: Stripe | null; elements: StripeElements | null };

/** Hands Stripe.js and the card form to the Place Order button (which sits outside the form, in the summary). */
export function CardBridge({ apiRef }: { apiRef: RefObject<CardApi> }) {
  const stripe = useStripe();
  const elements = useElements();
  useEffect(() => {
    apiRef.current = { stripe, elements };
  }, [apiRef, stripe, elements]);
  return null;
}

/** The card form (Payment Element) with its loading skeleton and a load error + Retry. */
export function CardFields({ billing, onChange }: { billing: { name: string; email: string; phone: string }; onChange: (complete: boolean) => void }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  // Stripe.js blocked or offline: the form never reports ready — show the error instead of a skeleton forever.
  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => setState("error"), 20_000);
    return () => window.clearTimeout(t);
  }, [state, attempt]);

  if (state === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-error-50 bg-error-50 px-4 py-3 text-sm text-error-600">
        <AlertTriangle aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
        <span className="flex-1">We couldn&apos;t load the secure card form. Check your connection and try again — or pay with Cash on Delivery.</span>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            setAttempt((n) => n + 1);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-2"
        >
          <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {state === "loading" && (
        <div role="status" aria-label="Loading the card form" className="absolute inset-0 flex flex-col gap-3 bg-card">
          <Skeleton className="h-11 rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-md" />
            <Skeleton className="h-11 rounded-md" />
          </div>
          <Skeleton className="h-11 rounded-md" />
        </div>
      )}
      <div className={state === "loading" ? "min-h-48 opacity-0" : undefined}>
        <PaymentElement
          key={attempt}
          options={{
            layout: "tabs",
            // Card only (Apple Pay / Google Pay ride on it). Link is hidden: it adds its own bank and Klarna
            // options, which aren't offered at Sundry checkout.
            wallets: { link: "never" },
            defaultValues: { billingDetails: { name: billing.name, email: billing.email, phone: billing.phone } },
          }}
          onReady={() => setState("ready")}
          onLoadError={() => setState("error")}
          onChange={(e: StripePaymentElementChangeEvent) => onChange(e.complete)}
        />
      </div>
    </div>
  );
}
