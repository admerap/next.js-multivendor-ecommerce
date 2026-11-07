"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, CircleCheck, CreditCard, LoaderCircle, Lock, MapPin, Pencil, RotateCcw, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { confirmAddresses, placeOrderAction } from "@/app/(storefront)/checkout/actions";
import { Button } from "@/components/ui/button";
import { SHIPPING_METHOD_INFO, type ShippingMethod } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { ADDRESS_TYPE_LABEL, checkoutAddressesSchema, emptyAddress, ORDER_NOTE_MAX, type AddressInput } from "@/lib/validations/checkout";
import { REGION } from "@/lib/regions";
import { STRIPE_MIN_CENTS } from "@/lib/stripe.client";
import { AddressFields } from "./AddressFields";
import { CardBridge, CardFields, StripeCheckout, type CardApi } from "./CardPayment";
import { CartSkeleton } from "./CartView";
import { CheckoutStepper } from "./CheckoutStepper";
import { clearCheckoutDraft, useCheckoutDraft } from "./checkoutDraft";
import { CouponForm } from "./CouponForm";
import { OrderSummary } from "./OrderSummary";
import { ShippingMethodPicker } from "./ShippingMethodPicker";
import { useCartQuote } from "./useCartQuote";

const FORM_ID = "checkout-shipping";
type Customer = { name: string; email: string; phone: string | null };
type PayMethod = "COD" | "STRIPE";

/** Errors keyed "shipping.city" / "billing.zip" → the `{ city: … }` map one AddressFields needs. */
const errorsFor = (all: Record<string, string>, prefix: "shipping" | "billing") =>
  Object.fromEntries(Object.entries(all).flatMap(([k, v]) => (k.startsWith(`${prefix}.`) ? [[k.slice(prefix.length + 1), v]] : [])));

/**
 * Checkout steps 2–3 (Checkout Page design): Shipping & Billing (?step=shipping) → Payment (?step=payment),
 * with the live order summary on the right. Payment only opens after the server accepted the addresses.
 * Everything typed is kept in the checkout draft (this browser) and re-validated when the order is placed.
 * Payment: Cash on Delivery, or Card (Stripe) when the server has Stripe keys (`cardEnabled`).
 */
export function CheckoutView({ customer, cardEnabled = false }: { customer: Customer; cardEnabled?: boolean }) {
  const router = useRouter();
  const step = useSearchParams().get("step") === "payment" ? "payment" : "shipping";
  const { draft, update, ready } = useCheckoutDraft();
  const coupons = draft.coupons ?? {};
  // Sales tax follows the shipping address as it's typed: once the state is chosen (or for countries
  // where the region is optional) the summary shows "Tax (CT 6.35%)".
  const shipDraft = draft.shipping ?? emptyAddress(customer);
  const shipTo = shipDraft.state || !REGION[shipDraft.country].required ? { country: shipDraft.country, state: shipDraft.state ?? "" } : null;
  const { cart, quote, status, error, retry, busy } = useCartQuote(coupons, draft.shippingMethod ?? "STANDARD", shipTo, !ready);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [placing, startPlacing] = useTransition();
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("COD");
  const [cardComplete, setCardComplete] = useState(false);
  const cardApi = useRef<CardApi>({ stripe: null, elements: null });
  // The card order already placed in this visit (kept so a declined card retries the same order).
  const cardOrder = useRef<{ orderNumber: number; clientSecret: string; total: number } | null>(null);

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

  // Card needs Stripe keys on the server and a total Stripe can charge; otherwise only COD is offered.
  const cardAvailable = cardEnabled && quote.total >= STRIPE_MIN_CENTS;
  const method: PayMethod = payMethod === "STRIPE" && cardAvailable ? "STRIPE" : "COD";
  const cardIncomplete = method === "STRIPE" && !cardComplete;

  const orderInput = (paymentMethod: PayMethod) => ({
    lines: cart.items.map((i) => ({ id: i.id, productId: i.productId, variationId: i.variationId ?? null, qty: i.qty })),
    coupons,
    addresses: { shipping, billingSame, billing: billingSame ? undefined : billing },
    note: draft.note ?? null,
    shippingMethod: draft.shippingMethod ?? "STANDARD",
    paymentMethod,
    acceptTerms,
    expectedTotal: quote.total,
  });
  const failed = (res: { code: string; error: string }) => {
    setPlaceError(res.error);
    if (res.code === "AUTH") router.push("/login?callbackUrl=/checkout?step=payment");
    else if (res.code === "INVALID" && res.error.startsWith("Your shipping details")) update({ addressesConfirmed: false });
    else if (res.code !== "PAYMENT") retry(); // show the shopper the current prices / stock / coupons
  };
  // Done: the cart and the draft are spent; the confirmation page is reachable by its own URL.
  const finish = (orderNumber: number) => {
    setPlaced(orderNumber);
    cart.clear();
    clearCheckoutDraft();
    router.replace(`/checkout/complete?order=${orderNumber}`);
  };
  const unreachable = { success: false as const, code: "SERVER" as const, error: "We couldn't reach the store. Check your connection — nothing was charged — and try again." };

  function place() {
    if (!quote || !acceptTerms || cardIncomplete) return;
    setPlaceError(null);
    if (method === "STRIPE") return placeCard();
    startPlacing(async () => {
      // Switching to COD after a declined card: the unpaid card order is closed first (its stock is freed).
      const retryOf = cardOrder.current?.orderNumber ?? draft.pendingCardOrder ?? null;
      const res = await placeOrderAction({ ...orderInput("COD"), retryOf }).catch(() => unreachable);
      if (!res.success) return failed(res);
      finish(res.orderNumber);
    });
  }

  /**
   * Card: check the card form → place the order (UNPAID, stock reserved; the server opens a PaymentIntent for its
   * own total) → confirm the card with Stripe.js (3-D Secure opens here if the bank asks). Success only navigates:
   * the order is marked PAID by Stripe's webhook, and the confirmation page waits for it. A declined card keeps the
   * same order and PaymentIntent, so the shopper can try another card; if the cart changed meanwhile a new order
   * replaces it (`retryOf`).
   */
  function placeCard() {
    const { stripe, elements } = cardApi.current;
    if (!stripe || !elements || !quote) return setPlaceError("The card form is still loading. Try again in a moment.");
    const total = quote.total;
    startPlacing(async () => {
      // Validates the card form (and opens a wallet sheet) — must come first, straight from the click.
      const { error: formError } = await elements.submit();
      if (formError) return setPlaceError(formError.message ?? "Check your card details.");

      let target = cardOrder.current;
      if (!target || target.total !== total) {
        // The earlier unpaid attempt — this visit's, or one remembered in the draft (shopper left and came back).
        const retryOf = target?.orderNumber ?? draft.pendingCardOrder ?? null;
        const res = await placeOrderAction({ ...orderInput("STRIPE"), retryOf }).catch(() => unreachable);
        if (!res.success) return failed(res);
        if (!res.clientSecret) return finish(res.orderNumber); // the earlier attempt turned out to be paid
        target = cardOrder.current = { orderNumber: res.orderNumber, clientSecret: res.clientSecret, total };
        update({ pendingCardOrder: res.orderNumber });
      }

      const { error } = await stripe
        .confirmPayment({
          elements,
          clientSecret: target.clientSecret,
          // Only used when a payment method needs a redirect; cards and 3-D Secure finish here.
          confirmParams: { return_url: `${window.location.origin}/checkout/complete?order=${target.orderNumber}` },
          redirect: "if_required",
        })
        .catch(() => ({ error: { type: "api_connection_error" as const, message: undefined } }));
      if (error) {
        setPlaceError(
          error.type === "card_error" || error.type === "validation_error"
            ? `${error.message ?? "Your card was declined."} Nothing was charged — try again or use another card.`
            : "We couldn't confirm your payment. Nothing was charged — please try again.",
        );
        return;
      }
      finish(target.orderNumber); // succeeded or processing — the webhook records the payment
    });
  }

  return (
    <>
      <div className="mb-7">
        <CheckoutStepper current={step === "payment" ? 2 : 1} />
      </div>
      <StripeCheckout active={cardEnabled && step === "payment" && method === "STRIPE"} amount={Math.max(quote.total, STRIPE_MIN_CENTS)}>
      {cardEnabled && <CardBridge apiRef={cardApi} />}
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
            <PaymentStep
              shipping={shipping}
              method={quote.needsShipping ? quote.shippingMethod : null}
              onBack={() => router.push("/checkout?step=shipping")}
              payMethod={method}
              onPayMethod={(m) => {
                setPayMethod(m);
                setPlaceError(null);
              }}
              cardEnabled={cardEnabled}
              cardAvailable={cardAvailable}
              onCardChange={setCardComplete}
            />
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
                shipTo={shipTo}
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
                    <Button
                      type="button"
                      size="lg"
                      onClick={place}
                      disabled={!acceptTerms || placing || busy || cardIncomplete}
                      aria-describedby={!acceptTerms ? "terms-hint" : cardIncomplete ? "card-hint" : undefined}
                      className="w-full"
                    >
                      {placing ? <LoaderCircle aria-hidden className="animate-spin" /> : <Lock aria-hidden />}
                      {placing ? (method === "STRIPE" ? "Processing payment…" : "Placing order…") : "Place Order"}
                    </Button>
                    {!acceptTerms ? (
                      <p id="terms-hint" className="text-center text-caption text-fg-muted">
                        Accept the terms above to place your order.
                      </p>
                    ) : (
                      cardIncomplete && (
                        <p id="card-hint" className="text-center text-caption text-fg-muted">
                          Enter your card details to continue.
                        </p>
                      )
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
      </StripeCheckout>
    </>
  );
}

/**
 * Payment step (Checkout Page design): Cash on Delivery, and Card (Stripe) when it's set up. Picking Card shows
 * Stripe's card form (and the wallets enabled in the Stripe dashboard, e.g. Link / Google Pay).
 */
function PaymentStep({
  shipping,
  method,
  onBack,
  payMethod,
  onPayMethod,
  cardEnabled,
  cardAvailable,
  onCardChange,
}: {
  shipping: AddressInput;
  method: ShippingMethod | null;
  onBack: () => void;
  payMethod: PayMethod;
  onPayMethod: (m: PayMethod) => void;
  cardEnabled: boolean;
  cardAvailable: boolean;
  onCardChange: (complete: boolean) => void;
}) {
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
        <p className="mt-1 mb-4 text-sm text-fg-muted">
          {cardEnabled ? "Pay by card now, or with cash when your order arrives." : "Cash on Delivery is available for all orders. Card and wallet payments are coming soon."}
        </p>
        <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-3">
          <PayOption value="COD" checked={payMethod === "COD"} onSelect={onPayMethod} icon={Banknote} label="Cash on Delivery" hint="Pay when it arrives" />
          {cardEnabled && (
            <PayOption
              value="STRIPE"
              checked={payMethod === "STRIPE"}
              onSelect={onPayMethod}
              icon={CreditCard}
              label="Card (Stripe)"
              hint={cardAvailable ? "Card, Apple Pay or Google Pay" : "Not available for this total"}
              disabled={!cardAvailable}
            />
          )}
        </div>
        {payMethod === "COD" ? (
          <p className="mt-4 flex items-start gap-2.5 rounded-md bg-sunken px-4 py-3.5 text-sm text-fg">
            <Banknote aria-hidden className="mt-0.5 size-4.5 shrink-0 text-primary" strokeWidth={1.9} />
            Pay with cash to the courier when your order is delivered. Have the exact amount ready.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <CardFields billing={{ name: shipping.name, email: shipping.email, phone: shipping.phone }} onChange={onCardChange} />
            <p className="flex items-start gap-2 text-caption text-fg-muted">
              <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-success-600" strokeWidth={2} />
              Payments are processed securely by Stripe. Your card details never reach Sundry&apos;s servers.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

/** One payment option: a real radio (keyboard: Tab to the group, arrows to switch) styled as a selectable row. */
function PayOption({
  value,
  checked,
  onSelect,
  icon: Icon,
  label,
  hint,
  disabled = false,
}: {
  value: PayMethod;
  checked: boolean;
  onSelect: (m: PayMethod) => void;
  icon: typeof Banknote;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-15 items-center gap-3.5 rounded-md border-[1.5px] px-4 py-3 transition-colors duration-(--dur-fast)",
        checked ? "border-primary bg-iris-50" : "border-line bg-card",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        !checked && !disabled && "hover:border-iris-200",
      )}
    >
      <input type="radio" name="payment" value={value} checked={checked} disabled={disabled} onChange={() => onSelect(value)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          checked ? "border-primary" : "border-line-default",
        )}
      >
        {checked && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <Icon aria-hidden className={cn("size-5 shrink-0", checked ? "text-primary" : "text-fg-muted")} strokeWidth={1.9} />
      {/* Phones: the hint goes under the name so neither wraps word by word. */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="font-semibold text-fg-strong">{label}</span>
        <span className="text-caption text-fg-muted sm:text-right">{hint}</span>
      </span>
    </label>
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
