import "server-only";

import Stripe from "stripe";

/**
 * The one server-side Stripe client (secret key). `server-only` makes any import from a client component a build
 * error, so the secret key can never reach the browser. Created on first use, not at import, so a build without
 * Stripe keys still works and COD keeps working when Stripe isn't configured.
 *
 * Env (.env, git-ignored):
 *   STRIPE_SECRET_KEY                   sk_test_… / sk_live_… — server only
 *   STRIPE_WEBHOOK_SECRET               whsec_… — server only (verifies /api/stripe/webhook)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_test_… / pk_live_… — safe in the browser
 * Key values are never logged; errors name the variable, not its value.
 */

export class StripeConfigError extends Error {}

let client: Stripe | null = null;

/** Is card payment usable? (Both keys present and the same mode.) The checkout hides the Card option otherwise. */
export function stripeEnabled(): boolean {
  return stripeConfigProblem() === null;
}

/** Why Stripe can't be used, for the server log — null when it's set up. Never includes a key. */
export function stripeConfigProblem(): string | null {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!secret) return "STRIPE_SECRET_KEY is not set";
  if (!/^(sk|rk)_(test|live)_/.test(secret)) return "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_ (is the publishable key in its place?)";
  if (!publishable) return "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set";
  if (!/^pk_(test|live)_/.test(publishable)) return "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_";
  if (secret.includes("_live_") !== publishable.includes("_live_")) return "Stripe keys are from different modes (one test, one live)";
  return null;
}

/** The webhook signing secret — throws when missing, so an unverifiable webhook is always refused. */
export function stripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !secret.startsWith("whsec_")) throw new StripeConfigError("STRIPE_WEBHOOK_SECRET is not set (it starts with whsec_)");
  return secret;
}

/** The Stripe client. Throws StripeConfigError when the keys aren't set up. */
export function stripe(): Stripe {
  const problem = stripeConfigProblem();
  if (problem) throw new StripeConfigError(problem);
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    // Retries are safe: every create call that moves money carries an idempotency key.
    maxNetworkRetries: 2,
    appInfo: { name: "Sundry Marketplace" },
  });
  return client;
}
