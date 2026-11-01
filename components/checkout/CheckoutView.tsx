"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, CircleCheck, LoaderCircle, Lock, MapPin, Pencil, RotateCcw, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { confirmAddresses, placeOrderAction } from "@/app/(storefront)/checkout/actions";
import { Button } from "@/components/ui/button";
import { SHIPPING_METHOD_INFO, type ShippingMethod } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { ADDRESS_TYPE_LABEL, checkoutAddressesSchema, emptyAddress, ORDER_NOTE_MAX, type AddressInput } from "@/lib/validations/checkout";
import { AddressFields } from "./AddressFields";
import { CartSkeleton } from "./CartView";
import { CheckoutStepper } from "./CheckoutStepper";
import { clearCheckoutDraft, useCheckoutDraft } from "./checkoutDraft";
import { CouponForm } from "./CouponForm";
import { OrderSummary } from "./OrderSummary";
import { ShippingMethodPicker } from "./ShippingMethodPicker";
import { useCartQuote } from "./useCartQuote";

const FORM_ID = "checkout-shipping";
type Customer = { name: string; email: string; phone: string | null };

/** Errors keyed "shipping.city" / "billing.zip" → the `{ city: … }` map one AddressFields needs. */
const errorsFor = (all: Record<string, string>, prefix: "shipping" | "billing") =>
  Object.fromEntries(Object.entries(all).flatMap(([k, v]) => (k.startsWith(`${prefix}.`) ? [[k.slice(prefix.length + 1), v]] : [])));

/**
 * Checkout steps 2–3 (Checkout Page design): Shipping & Billing (?step=shipping) → Payment (?step=payment),
 * with the live order summary on the right. Payment only opens after the server accepted the addresses.
 * Everything typed is kept in the checkout draft (this browser) and re-validated when the order is placed.
 */
export function CheckoutView({ customer }: { customer: Customer }) {
  const router = useRouter();
  const step = useSearchParams().get("step") === "payment" ? "payment" : "shipping";
  const { draft, update, ready } = useCheckoutDraft();
  const coupons = draft.coupons ?? {};
  const { cart, quote, status, error, retry, busy } = useCartQuote(coupons, draft.shippingMethod ?? "STANDARD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [placing, startPlacing] = useTransition();
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  const shipping = draft.shipping ?? emptyAddress(customer);
  const billingSame = draft.billingSame ?? true;
  const billing = draft.billing ?? emptyAddress(customer);

  // Payment is locked until Shipping & Billing was accepted (FR-S28) — e.g. a typed ?step=payment URL.
  useEffect(() => {
    if (ready && step === "payment" && !draft.addressesConfirmed) router.replace("/checkout?step=shipping");
  }, [ready, step, draft.addressesConfirmed, router]);

  if (placed !== null) {
    return (
      <Notice icon={CircleCheck} title={`Order #${placed} placed!`} text="Taking you to your order confirmation…">
        <LoaderCircle aria-hidden className="mx-auto size-6 animate-spin text-primary" />
      </Notice>
    );
  }
  if (!ready || !cart.ready || (cart.items.length > 0 && !quote && status !== "error")) return <CartSkeleton />;
  if (cart.items.length === 0) {
    return (
      <Notice icon={ShoppingCart} title="Your cart is empty" text="Add products to your cart before checking out.">
        <Button asChild>
          <Link href="/">
            <ShoppingBag aria-hidden />
            Start shopping
          </Link>
        </Button>
      </Notice>
    );
  }
  if (!quote) {
    return (
      <Notice icon={AlertTriangle} tone="error" title="Couldn't load your order" text={error ?? "Something went wrong."}>
        <Button type="button" onClick={retry}>
          <RotateCcw aria-hidden />
          Retry
        </Button>
      </Notice>
    );
  }
  if (quote.blocked) {
    return (
      <Notice icon={AlertTriangle} tone="warning" title="Some items need your attention" text="An item in your cart is no longer available or out of stock. Review your cart to continue.">
        <Button asChild>
          <Link href="/checkout">
            <ArrowLeft aria-hidden />
            Back to cart
          </Link>
        </Button>
      </Notice>
    );
  }

  const edit = (patch: Partial<{ shipping: AddressInput; billing: AddressInput; billingSame: boolean }>, cleared: string[]) => {
    update({ ...patch, addressesConfirmed: false });
    if (cleared.some((k) => errors[k])) setErrors((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => !cleared.includes(k))));
  };

  function proceed(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = { shipping, billingSame, billing: billingSame ? undefined : billing };
    const local = checkoutAddressesSchema.safeParse(input);
    if (!local.success) {
      const out: Record<string, string> = {};
      for (const i of local.error.issues) out[i.path.join(".") || "form"] ??= i.message;
      setErrors(out);
      document.getElementById(`${Object.keys(out)[0]?.replace(".", "-")}`)?.focus();
      return;
    }
    start(async () => {
      const res = await confirmAddresses(input).catch(() => ({ success: false as const, error: "We couldn't save your address. Check your connection and try again." }));
      if (!res.success) {
        setErrors({ ...("fieldErrors" in res && res.fieldErrors ? res.fieldErrors : {}), form: res.error });
        return;
      }
      setErrors({});
      update({ shipping: res.data.shipping, billingSame: res.data.billingSame, billing: res.data.billing, addressesConfirmed: true });
      router.push("/checkout?step=payment");
      window.scrollTo({ top: 0 });
    });
  }

  function place() {
    if (!quote || !acceptTerms) return;
    setPlaceError(null);
    const lines = cart.items.map((i) => ({ id: i.id, productId: i.productId, variationId: i.variationId ?? null, qty: i.qty }));
    startPlacing(async () => {
      const res = await placeOrderAction({
        lines,
        coupons,
        addresses: { shipping, billingSame, billing: billingSame ? undefined : billing },
        note: draft.note ?? null,
        shippingMethod: draft.shippingMethod ?? "STANDARD",
        paymentMethod: "COD",
        acceptTerms,
        expectedTotal: quote.total,
      }).catch(() => ({ success: false as const, code: "SERVER" as const, error: "We couldn't reach the store. Check your connection — nothing was charged — and try again." }));
      if (!res.success) {
        setPlaceError(res.error);
        if (res.code === "AUTH") router.push("/login?callbackUrl=/checkout?step=payment");
        else if (res.code === "INVALID" && res.error.startsWith("Your shipping details")) update({ addressesConfirmed: false });
        else retry(); // show the shopper the current prices / stock / coupons
        return;
      }
      // Done: the cart and the draft are spent; the confirmation page is reachable by its own URL.
      setPlaced(res.orderNumber);
      cart.clear();
      clearCheckoutDraft();
      router.replace(`/checkout/complete?order=${res.orderNumber}`);
    });
  }

  return (
    <>
      <div className="mb-7">
        <CheckoutStepper current={step === "payment" ? 2 : 1} />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-5">
          {step === "shipping" ? (
            <form id={FORM_ID} onSubmit={proceed} noValidate className="flex flex-col gap-5">
              <h2 className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-fg-strong">Shipping Address</h2>
              {errors.form && (
                <p role="alert" className="flex items-center gap-2 rounded-md border border-error-50 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600">
                  <AlertTriangle aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
                  {errors.form}
                </p>
              )}
              <AddressFields idPrefix="shipping" title="Shipping Address" value={shipping} errors={errorsFor(errors, "shipping")} onChange={(p) => edit({ shipping: { ...shipping, ...p } }, Object.keys(p).map((k) => `shipping.${k}`))} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-fg-strong">Billing Address</h2>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-fg-strong">
                  <input type="checkbox" checked={billingSame} onChange={(e) => edit({ billingSame: e.target.checked }, ["billing"])} className="peer sr-only" />
                  <span aria-hidden className={cn("grid size-5 place-items-center rounded-xs border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", billingSame ? "border-primary bg-primary text-on-primary" : "border-line-default bg-card")}>
                    {billingSame && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  Same as shipping address
                </label>
              </div>
              {billingSame ? (
                <p className="flex items-center gap-2.5 rounded-md bg-iris-50 px-4 py-3.5 text-sm text-primary">
                  <CircleCheck aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
                  Billing address is the same as your shipping address.
                </p>
              ) : (
                <>
                  {errors.billing && (
                    <p role="alert" className="text-caption font-semibold text-error-600">
                      {errors.billing}
                    </p>
                  )}
                  <AddressFields idPrefix="billing" title="Billing Address" value={billing} errors={errorsFor(errors, "billing")} onChange={(p) => edit({ billing: { ...billing, ...p } }, [...Object.keys(p).map((k) => `billing.${k}`), "billing"])} />
                </>
              )}

              {status === "error" && error && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-error-50 bg-error-50 px-4 py-3 text-sm text-error-600">
                  <AlertTriangle aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={retry} className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-2">
                    <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
                    Retry
                  </button>
                </div>
              )}
              {quote.needsShipping && <ShippingMethodPicker quote={quote} value={draft.shippingMethod ?? "STANDARD"} busy={busy} onChange={(m) => update({ shippingMethod: m })} />}

              {/* Order note (sent to every seller in the order) */}
              <div>
                <label htmlFor="order-note" className="mb-2 block text-sm font-bold text-fg-strong">
                  Order Note (Optional)
                </label>
                <textarea
                  id="order-note"
                  value={draft.note ?? ""}
                  onChange={(e) => update({ note: e.target.value.slice(0, ORDER_NOTE_MAX) })}
                  maxLength={ORDER_NOTE_MAX}
                  placeholder="Delivery instructions or a note for the seller…"
                  className="min-h-26 w-full resize-y rounded-md border border-line bg-card px-4 py-3.5 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                />
                <p className="mt-1 text-right text-caption text-fg-subtle tabular-nums">
                  {(draft.note ?? "").length}/{ORDER_NOTE_MAX}
                </p>
              </div>
            </form>
          ) : (
            <PaymentStep shipping={shipping} method={quote.needsShipping ? quote.shippingMethod : null} onBack={() => router.push("/checkout?step=shipping")} />
          )}
        </div>

        <div className="w-full min-w-0 lg:max-w-95 lg:flex-[1_1_300px]">
          <OrderSummary
            quote={quote}
            busy={busy}
            coupon={
              <CouponForm
                quote={quote}
                lines={cart.items.map((i) => ({ id: i.id, productId: i.productId, variationId: i.variationId ?? null, qty: i.qty }))}
                coupons={coupons}
                onChange={(next) => update({ coupons: next })}
              />
            }
            actions={
              <>
                {step === "payment" && (
                  <>
                    <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-[0.81rem] text-fg">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="peer sr-only" />
                      <span aria-hidden className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", acceptTerms ? "border-primary bg-primary text-on-primary" : "border-line-default bg-card")}>
                        {acceptTerms && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span>
                        I agree to your <b className="font-semibold text-fg-strong">Terms and conditions</b>, <b className="font-semibold text-fg-strong">Privacy policy</b>, <b className="font-semibold text-fg-strong">Refund policy</b>
                      </span>
                    </label>
                    {placeError && (
                      <p role="alert" className="flex items-start gap-2 rounded-md border border-error-50 bg-error-50 px-3 py-2.5 text-[0.81rem] font-semibold text-error-600">
                        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
                        {placeError}
                      </p>
                    )}
                    <Button type="button" size="lg" onClick={place} disabled={!acceptTerms || placing || busy} aria-describedby={acceptTerms ? undefined : "terms-hint"} className="w-full">
                      {placing ? <LoaderCircle aria-hidden className="animate-spin" /> : <Lock aria-hidden />}
                      {placing ? "Placing order…" : "Place Order"}
                    </Button>
                    {!acceptTerms && (
                      <p id="terms-hint" className="text-center text-caption text-fg-muted">
                        Accept the terms above to place your order.
                      </p>
                    )}
                  </>
                )}
                {step === "shipping" && (
                  <Button type="submit" form={FORM_ID} size="lg" disabled={pending || busy} className="w-full">
                    {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <ArrowRight aria-hidden />}
                    Proceed to Payment
                  </Button>
                )}
              </>
            }
          />
        </div>
      </div>
    </>
  );
}

/** Payment step (Checkout Page design). v1 offers Cash on Delivery only; Place Order arrives with the order flow. */
function PaymentStep({ shipping, method, onBack }: { shipping: AddressInput; method: ShippingMethod | null; onBack: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-fg-strong">Payment method</h2>
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden />
          Go back
        </Button>
      </div>

      <section aria-label="Deliver to" className="flex items-start gap-3.5 rounded-lg bg-card p-5 shadow-sm">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50">
          <MapPin aria-hidden className="size-5 text-primary" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold text-fg-strong">
            Deliver to {shipping.name} <span className="ml-1 rounded-full bg-sunken px-2 py-0.5 text-caption font-semibold text-fg-muted">{ADDRESS_TYPE_LABEL[shipping.type ?? "HOME"]}</span>
          </p>
          <p className="mt-1 text-fg-muted">
            {shipping.address}{shipping.address2 ? `, ${shipping.address2}` : ""}, {shipping.city}{shipping.state ? `, ${shipping.state}` : ""} {shipping.zip}, {shipping.country}
          </p>
          <p className="text-fg-muted">
            {shipping.phone} · {shipping.email}
          </p>
          {method && (
            <p className="mt-1.5 font-semibold text-fg-strong">
              {SHIPPING_METHOD_INFO[method].label} <span className="font-normal text-fg-muted">· {SHIPPING_METHOD_INFO[method].eta}</span>
            </p>
          )}
        </div>
        <button type="button" onClick={onBack} aria-label="Edit shipping address" className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:text-primary">
          <Pencil aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </section>

      <section aria-labelledby="pay-title" className="rounded-lg bg-card p-5 shadow-sm sm:p-6">
        <h3 id="pay-title" className="font-display text-[1.06rem] font-extrabold text-fg-strong">
          Select a payment method
        </h3>
        <p className="mt-1 mb-4 text-sm text-fg-muted">Cash on Delivery is available for all orders. Card and wallet payments are coming soon.</p>
        <div role="radiogroup" aria-label="Payment method">
          <label className="flex min-h-15 cursor-pointer items-center gap-3.5 rounded-md border-[1.5px] border-primary bg-iris-50 px-4 py-3">
            <input type="radio" name="payment" value="COD" checked readOnly className="peer sr-only" />
            <span aria-hidden className="grid size-5 place-items-center rounded-full border-2 border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
              <span className="size-2.5 rounded-full bg-primary" />
            </span>
            <Banknote aria-hidden className="size-5 text-primary" strokeWidth={1.9} />
            <span className="flex-1 font-semibold text-fg-strong">Cash on Delivery</span>
            <span className="text-caption text-fg-muted">Pay when it arrives</span>
          </label>
        </div>
        <p className="mt-4 flex items-start gap-2.5 rounded-md bg-sunken px-4 py-3.5 text-sm text-fg">
          <Banknote aria-hidden className="mt-0.5 size-4.5 shrink-0 text-primary" strokeWidth={1.9} />
          Pay with cash to the courier when your order is delivered. Have the exact amount ready.
        </p>
      </section>
    </>
  );
}

function Notice({ icon: Icon, tone = "info", title, text, children }: { icon: typeof ShoppingCart; tone?: "info" | "warning" | "error"; title: string; text: string; children: React.ReactNode }) {
  return (
    <div role={tone === "info" ? undefined : "alert"} className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-16 text-center shadow-sm">
      <span className={cn("grid size-19 place-items-center rounded-full", tone === "error" ? "bg-error-50" : tone === "warning" ? "bg-warning-50" : "bg-iris-50")}>
        <Icon aria-hidden className={cn("size-9", tone === "error" ? "text-error-500" : tone === "warning" ? "text-warning-600" : "text-primary")} strokeWidth={1.6} />
      </span>
      <h2 className="font-display text-h4 font-bold text-fg-strong">{title}</h2>
      <p className="max-w-[380px] text-sm text-fg-muted">{text}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
