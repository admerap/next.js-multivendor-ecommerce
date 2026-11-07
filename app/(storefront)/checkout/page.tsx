import { ShoppingCart, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { CartSkeleton, CartView } from "@/components/checkout/CartView";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe.server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

type Props = { searchParams: Promise<{ step?: string | string[] }> };

/**
 * Checkout, three steps on one URL: Cart (default — review items, coupons, totals) → Shipping & Billing
 * (?step=shipping) → Payment (?step=payment). Anyone can review the cart; the address and payment steps
 * are for signed-in customers — guests sign in and come straight back (the browser cart is kept).
 * Vendor and admin accounts can't buy.
 */
export default async function CheckoutPage({ searchParams }: Props) {
  const raw = (await searchParams).step;
  const step = raw === "shipping" || raw === "payment" ? raw : "cart";

  if (step === "cart") {
    return (
      <main className={cn(pageContainer, "pt-7 pb-4")}>
        <h1 className="sr-only">Checkout — Cart</h1>
        <div className="mb-7">
          <CheckoutStepper current={0} />
        </div>
        <CartView />
      </main>
    );
  }

  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?step=${step}`)}`);

  if (session.user.role !== "CUSTOMER") {
    return (
      <main className={cn(pageContainer, "pt-8 pb-4")}>
        <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-16 text-center shadow-sm">
          <span className="grid size-19 place-items-center rounded-full bg-iris-50">
            <Store aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
          </span>
          <h1 className="font-display text-h4 font-bold text-fg-strong">Checkout is for customer accounts</h1>
          <p className="max-w-105 text-sm text-fg-muted">You&apos;re signed in as a {session.user.role === "VENDOR" ? "seller" : "staff member"}. Sign in with a customer account to place orders.</p>
          <Button asChild className="mt-1.5">
            <Link href="/checkout">
              <ShoppingCart aria-hidden />
              Back to cart
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true } });

  return (
    <main className={cn(pageContainer, "pt-7 pb-4")}>
      <h1 className="sr-only">Checkout</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CheckoutView
          customer={{ name: user?.name ?? session.user.name ?? "", email: user?.email ?? session.user.email ?? "", phone: user?.phone ?? null }}
          // Card (Stripe) is offered only when the server has valid Stripe keys; COD always is.
          cardEnabled={stripeEnabled()}
        />
      </Suspense>
    </main>
  );
}
