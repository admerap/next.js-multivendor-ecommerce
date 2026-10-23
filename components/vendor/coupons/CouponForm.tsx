"use client";

import { Check, Info, PencilLine, RotateCcw, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createCoupon, updateCoupon, type ActionResult, type CouponProductOption } from "@/app/vendor/(panel)/coupons/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { cn } from "@/lib/utils";
import {
  COUPON_SCOPE_LABELS,
  COUPON_SCOPES,
  COUPON_KIND_LABELS,
  COUPON_KINDS,
  couponKindOf,
  couponFormSchema,
  generateCouponCode,
  kindToStorage,
  todayIso,
  type CouponDiscountTypeValue,
  type CouponKind,
  type CouponScopeValue,
  type CouponTypeValue,
} from "@/lib/validations/coupon";
import { CouponProductPicker } from "./CouponProductPicker";

export type CouponFormValues = {
  type: CouponTypeValue | "";
  title: string;
  code: string;
  limitPerUser: string;
  usageLimit: string;
  discountType: CouponDiscountTypeValue;
  discountValue: string;
  minPurchase: string;
  maxDiscount: string;
  startsAt: string;
  expiresAt: string;
  scope: CouponScopeValue;
  isActive: boolean;
};

export const EMPTY_COUPON: CouponFormValues = {
  type: "",
  title: "",
  code: "",
  limitPerUser: "",
  usageLimit: "",
  discountType: "AMOUNT",
  discountValue: "",
  minPurchase: "",
  maxDiscount: "",
  startsAt: "",
  expiresAt: "",
  scope: "STORE_WIDE",
  isActive: true,
};

const inputCls = "h-12 focus-visible:shadow-[0_0_0_3px_var(--iris-100)]";

/**
 * Create Coupon form (the FORM half of vendorcoupon). Same Zod schema as the server. Coupons only
 * ever apply to this store's products; "Specific products" lists only this vendor's products.
 */
export function CouponForm({
  storeName,
  edit,
}: {
  storeName: string;
  /** Edit mode: the saved coupon (values + attached products). */
  edit?: { id: string; values: CouponFormValues; products: CouponProductOption[]; usedCount: number };
}) {
  const initial = edit?.values;
  const uid = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const start = initial ?? { ...EMPTY_COUPON, code: "" };
  const [v, setV] = useState<CouponFormValues>(start);
  const [products, setProducts] = useState<CouponProductOption[]>(edit?.products ?? []);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = pending || done;
  const free = v.type === "FREE_DELIVERY";
  const percent = !free && v.discountType === "PERCENTAGE";

  const fid = (k: string) => `${uid}-${k}`;
  const set = <K extends keyof CouponFormValues>(k: K, value: CouponFormValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function fail(next: Record<string, string>, message?: string) {
    setErrors(next);
    toast.error(message ?? Object.values(next)[0] ?? "Please fix the highlighted fields");
    requestAnimationFrame(() => document.querySelector<HTMLElement>("form [aria-invalid=true]")?.focus());
  }

  function submit() {
    if (busy) return;
    const payload = { ...v, productIds: products.map((p) => p.id) };
    const parsed = couponFormSchema.safeParse(payload);
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    // Old expired coupons stay editable; only a changed expiry must be today or later.
    if (v.expiresAt && v.expiresAt < todayIso() && v.expiresAt !== initial?.expiresAt) next.expiresAt ??= "Expire date has already passed — choose today or a later date";
    if (Object.keys(next).length) return fail(next);

    setErrors({});
    startTransition(async () => {
      let res: ActionResult<{ id: string; needsReview?: boolean }>;
      try {
        res = edit ? await updateCoupon({ ...payload, id: edit.id }) : await createCoupon(payload);
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
        return;
      }
      if (!res.success) return fail(res.fieldErrors ?? {}, res.error);
      setDone(true);
      toast.success(
        edit
          ? res.data?.needsReview
            ? "Coupon updated — sent for approval"
            : "Coupon updated"
          : "Coupon created — waiting for approval",
      );
      router.push("/vendor/coupons");
    });
  }

  function reset() {
    setV({ ...EMPTY_COUPON });
    setProducts([]);
    setErrors({});
    toast.success("Form reset");
  }

  const select = <T extends string>(key: keyof CouponFormValues, label: string, value: string, options: readonly T[], labels: Record<T, string>, opts: { required?: boolean; placeholder?: string; disabled?: boolean } = {}) => (
    <Field id={fid(key)} label={label} required={opts.required} error={errors[key]}>
      <Select value={value} onValueChange={(x) => set(key, x as never)} disabled={busy || opts.disabled}>
        <SelectTrigger {...ariaFor(fid(key), errors[key])} className={cn(inputCls, "[&>span]:truncate")}>
          <SelectValue placeholder={opts.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {labels[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const text = (key: keyof CouponFormValues, label: string, opts: { required?: boolean; placeholder?: string; inputMode?: "decimal" | "numeric"; type?: string; info?: string; hint?: string; disabled?: boolean; action?: React.ReactNode; maxLength?: number } = {}) => (
    <Field id={fid(key)} label={label} required={opts.required} info={opts.info} hint={opts.hint} error={errors[key]} action={opts.action}>
      <Input
        {...ariaFor(fid(key), errors[key])}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        value={v[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={busy || opts.disabled}
        className={cn(inputCls, opts.inputMode && "tabular-nums", key === "code" && "font-semibold tracking-[0.03em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case")}
      />
    </Field>
  );

  return (
    <form
      noValidate
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-lg bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong">{edit ? "Edit Coupon" : "Create Coupon"}</h2>
          <p className="mt-1 text-[0.82rem] text-fg-muted">
            Coupons apply only to {storeName} products. You bear the discount.
          </p>
        </div>
        {edit && (
          <span className="inline-flex h-7.5 items-center gap-1.5 rounded-full bg-saffron-50 px-3 text-caption font-bold text-saffron-700">
            <PencilLine aria-hidden className="size-3.5" strokeWidth={2.2} />
            Editing {initial?.code}
          </span>
        )}
      </div>

      <div className="grid items-start gap-x-5 gap-y-4.5 sm:grid-cols-2 lg:grid-cols-3">
        <Field id={fid("type")} label="Coupon Type" required error={errors.type}>
          <Select
            value={couponKindOf(v)}
            onValueChange={(k) => {
              setV((x) => ({ ...x, ...kindToStorage(k as CouponKind) }));
              setErrors((e) => ({ ...e, type: undefined, discountValue: undefined }));
            }}
            disabled={busy}
          >
            <SelectTrigger {...ariaFor(fid("type"), errors.type)} className={cn(inputCls, "[&>span]:truncate")}>
              <SelectValue placeholder="Select coupon type" />
            </SelectTrigger>
            <SelectContent>
              {COUPON_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {COUPON_KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {text("title", "Coupon Title", { required: true, placeholder: "e.g. 75% off on purchase", maxLength: 100 })}
        {text("code", "Coupon Code", {
          required: true,
          placeholder: "e.g. SAVE10",
          maxLength: 32,
          info: "Unique within your store. Letters, numbers, dashes or underscores.",
          action: (
            <button type="button" onClick={() => set("code", generateCouponCode())} disabled={busy} className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:text-primary-hover max-lg:min-h-11">
              <Shuffle aria-hidden className="size-3.5" strokeWidth={2} />
              Generate code
            </button>
          ),
        })}

        <Field id={fid("customer")} label="Customer" info="Coupons for specific customers become available once your store has orders.">
          <Select value="ALL" disabled>
            <SelectTrigger id={fid("customer")} className={cn(inputCls, "cursor-not-allowed opacity-70")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All customers</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {text("limitPerUser", "Limit For Same User", { placeholder: "e.g. 10", inputMode: "numeric", info: "How many times one customer can use it. Empty = no limit." })}
        {text("usageLimit", "Total Usage Limit", { placeholder: "e.g. 500", inputMode: "numeric", info: "How many times it can be used in total. Empty = no limit." })}

        <div className={cn("contents", free && "[&>*]:pointer-events-none [&>*]:opacity-45")} aria-disabled={free || undefined}>
          {text("discountValue", percent ? "Discount Amount (%)" : "Discount Amount ($)", { required: !free, placeholder: percent ? "e.g. 15" : "e.g. 50", inputMode: percent ? "numeric" : "decimal", disabled: free })}
          {text("minPurchase", "Minimum Purchase ($)", { placeholder: "e.g. 100", inputMode: "decimal", info: "Checked against what the customer buys from your store only.", disabled: free })}
        </div>
        {percent && text("maxDiscount", "Maximum Discount ($)", { placeholder: "e.g. 75", inputMode: "decimal", info: "Caps a percentage discount. Empty = no cap." })}

        {text("startsAt", "Start Date", { required: true, type: "date" })}
        {text("expiresAt", "Expire Date", { required: true, type: "date", hint: "Valid through the end of this day." })}

        {select("scope", "Applies To", v.scope, COUPON_SCOPES, COUPON_SCOPE_LABELS, {})}
        <div className="flex min-w-0 flex-col gap-2">
          <span id={fid("active")} className="flex min-h-5 items-center gap-1.5 text-[0.82rem] font-semibold text-fg">
            Status
          </span>
          <div className="flex h-12 items-center justify-between rounded-md border border-line px-3.5">
            <span className="text-sm font-semibold text-fg-strong">{v.isActive ? "Active" : "Inactive"}</span>
            <Switch checked={v.isActive} onCheckedChange={(x) => set("isActive", x)} aria-labelledby={fid("active")} disabled={busy} />
          </div>
        </div>

        {v.scope === "SPECIFIC_PRODUCTS" && (
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-3">
            <label htmlFor={fid("productIds")} className="flex min-h-5 items-center gap-1.5 text-[0.82rem] font-semibold text-fg">
              Products <span aria-hidden className="text-error-500">*</span>
            </label>
            <CouponProductPicker id={fid("productIds")} selected={products} onChange={(p) => (setProducts(p), setErrors((e) => ({ ...e, productIds: undefined })))} error={errors.productIds} disabled={busy} />
            {errors.productIds && (
              <span id={`${fid("productIds")}-error`} role="alert" className="text-caption font-semibold text-error-600">
                {errors.productIds}
              </span>
            )}
          </div>
        )}
      </div>

      {free && (
        <p className="mt-3.5 flex items-center gap-2 text-[0.82rem] text-fg-muted">
          <Info aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={2} />
          Free shipping coupons waive shipping, so discount fields are not needed.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3 max-sm:*:flex-1">
        {initial ? (
          <Button asChild variant="secondary" className="h-12">
            <Link href="/vendor/coupons">
              <X aria-hidden />
              Cancel
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={reset} disabled={busy} className="h-12 px-5.5">
            <RotateCcw aria-hidden />
            Reset
          </Button>
        )}
        <Button type="submit" disabled={busy} aria-busy={busy} className="h-12 px-7 shadow-xs">
          {busy ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Check aria-hidden />}
          {busy ? "Saving…" : initial ? "Update" : "Submit"}
        </Button>
      </div>
    </form>
  );
}
