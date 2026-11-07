import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeEvent } from "@/lib/payments.server";
import { stripe, StripeConfigError, stripeWebhookSecret } from "@/lib/stripe.server";

/**
 * POST /api/stripe/webhook — Stripe's events about card payments; the ONLY place a card order becomes PAID.
 * Every call must carry a valid `Stripe-Signature` for STRIPE_WEBHOOK_SECRET, checked against the raw body —
 * anything else gets 400 and changes nothing. Handlers are idempotent (Stripe retries and may repeat events).
 * Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints the whsec_ secret.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text(); // raw body — the signature covers these exact bytes
    event = stripe().webhooks.constructEvent(body, signature, stripeWebhookSecret());
  } catch (error) {
    if (error instanceof StripeConfigError) {
      console.error("[stripe webhook] not configured:", error.message);
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    console.warn("[stripe webhook] rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event);
    if (outcome !== "ignored") console.info(`[stripe webhook] ${event.type} ${event.id}: ${outcome}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    // 500 → Stripe retries later (the handlers are safe to repeat).
    console.error(`[stripe webhook] ${event.type} ${event.id} failed:`, error instanceof Error ? error.name : error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
