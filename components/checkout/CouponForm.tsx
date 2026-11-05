"use client";

import { AlertTriangle, LoaderCircle, Tag, X } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import toast from "react-hot-toast";
import { applyCoupon } from "@/app/(storefront)/cart/actions";
import type { CartLineInput, CartQuote, ShipTo } from "@/lib/checkout";
import { money } from "@/lib/money";

/**
 * Coupon box under the total. A code belongs to one store (codes are unique per vendor); applying it
 * finds that store in the cart and validates it on the server against that store's lines only. One
 * coupon per store — applying another code for the same store replaces it. Every quote re-validates
 * the applied codes, so a coupon that stops qualifying (cart changed, expired…) shows why.
 */
export function CouponForm({
  quote,
  lines,
  coupons,
  onChange,
  shipTo = null,
}: {
  shipTo?: ShipTo | null;
  quote: CartQuote;
  lines: CartLineInput[];
  coupons: Record<string, string>;
  onChange: (coupons: Record<string, string>) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return setError("Enter a coupon code.");
    start(async () => {
      const res = await applyCoupon({ code: value, lines, coupons, shippingMethod: quote.shippingMethod, shipTo }).catch(() => ({ success: false as const, error: "We couldn't check this coupon right now. Please try again." }));
      if (!res.success) {
        setError(res.error); // shown under the field (role="alert") — no toast on top of the button
        return;
      }
      setError(null);
      setCode("");
      onChange({ ...coupons, ...Object.fromEntries(res.applied.map((a) => [a.vendorId, a.code])) });
      for (const a of res.applied) {
        toast.success(a.freeShipping ? `${a.code} applied — free delivery from ${a.store}` : `${a.code} applied to ${a.store} — you save ${money(a.discount)}`);
      }
    });
  }

  const remove = (vendorId: string) => {
    const next = { ...coupons };
    delete next[vendorId];
    onChange(next);
  };
  const applied = quote.stores.filter((s) => s.vendor.id && coupons[s.vendor.id]);

  return (
    <div className="mb-5">
      <form onSubmit={submit} noValidate>
        <label htmlFor={id} className="sr-only">
          Coupon code
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Coupon code"
            maxLength={32}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-sunken px-3.5 text-sm font-semibold tracking-wide text-fg-strong uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity duration-(--dur-fast) hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" strokeWidth={2} /> : <Tag aria-hidden className="size-4" strokeWidth={2} />}
            Apply
          </button>
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-caption font-semibold text-error-600">
            {error}
          </p>
        )}
      </form>

      {applied.length > 0 && (
        <ul aria-label="Applied coupons" className="mt-3 flex flex-col gap-2">
          {applied.map((s) => {
            const code = coupons[s.vendor.id]!;
            const ok = s.coupon?.code === code;
            return (
              <li key={s.vendor.id} className={ok ? "rounded-md border border-success-50 bg-success-50 px-3 py-2" : "rounded-md border border-warning-50 bg-warning-50 px-3 py-2"}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-[0.81rem]">
                    <b className={ok ? "text-success-600" : "text-warning-600"}>{code}</b>
                    <span className="text-fg"> · {s.vendor.name}</span>
                  </span>
                  {ok && s.coupon && <b className="text-[0.81rem] text-success-600 tabular-nums">{s.coupon.freeShipping ? "Free delivery" : `− ${money(s.coupon.discount)}`}</b>}
                  <button
                    type="button"
                    onClick={() => remove(s.vendor.id)}
                    aria-label={`Remove coupon ${code}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-fg-muted transition-colors duration-(--dur-fast) hover:bg-card hover:text-error-500 max-lg:size-11"
                  >
                    <X aria-hidden className="size-4" strokeWidth={2.2} />
                  </button>
                </div>
                {!ok && s.couponError && (
                  <p className="mt-1 flex items-start gap-1 text-caption text-warning-600">
                    <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} />
                    {s.couponError.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
