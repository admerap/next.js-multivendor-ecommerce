"use client";

import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { registerVendorAction } from "@/lib/actions/auth";
import { vendorAccountStepSchema, vendorStoreStepSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";
import { AuthField, PasswordField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

const COUNTRY_CODES = [
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
  { value: "+49", label: "DE +49" },
  { value: "+34", label: "ES +34" },
  { value: "+52", label: "MX +52" },
  { value: "+51", label: "PE +51" },
];

const STEP_ONE_FIELDS = ["email", "phone", "password", "confirmPassword"];

function StepDot({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      className={cn(
        "grid size-6.5 place-items-center rounded-full text-caption font-extrabold",
        on ? "bg-primary text-on-primary" : "bg-sunken text-fg-muted",
      )}
    >
      {n}
    </span>
  );
}

export function VendorRegisterForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [countryCode, setCountryCode] = useState("+1");
  const [showPw, setShowPw] = useState(false);
  const form = useAuthForm({
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    storeName: "",
    storeAddress: "",
    acceptTerms: false as boolean,
  });
  const { values, errors } = form;
  const payload = { ...values, phone: `${countryCode} ${values.phoneNumber.trim()}` };

  const togglePw = () => setShowPw((v) => !v);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const parsed = vendorAccountStepSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const key = i.path[0] === "phone" ? "phoneNumber" : String(i.path[0]);
        errs[key] ??= i.message;
      }
      form.setErrors(errs);
      return;
    }
    form.setErrors({});
    setStep(2);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.validate(vendorStoreStepSchema)) return;
    form.run(async () => {
      const result = await registerVendorAction(payload);
      // Account-step errors from the server (e.g. duplicate email) send the user back to step 1.
      if (result?.fieldErrors && Object.keys(result.fieldErrors).some((k) => STEP_ONE_FIELDS.includes(k))) {
        setStep(1);
        if (result.fieldErrors.phone) result.fieldErrors.phoneNumber = result.fieldErrors.phone;
      }
      return result;
    });
  }

  const field = (key: keyof typeof values) => ({
    name: key,
    value: values[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => form.set(key, e.target.value),
    error: errors[key],
    errorIcon: false,
    required: true,
  });

  return (
    <div className="min-w-0 flex-[1.4_1_420px] rounded-xl bg-card p-[clamp(20px,3vw,32px)] shadow-md">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong">
          {step === 1 ? "Create An Account" : "Store Information"}
        </h2>
        <div className="flex items-center gap-2 text-caption font-bold text-fg-muted" aria-label={`Step ${step} of 2`}>
          <StepDot n={1} on />
          <span aria-hidden className={cn("h-0.5 w-6", step === 2 ? "bg-primary" : "bg-line-default")} />
          <StepDot n={2} on={step === 2} />
          <span className="ml-1">Step {step} of 2</span>
        </div>
      </div>

      {form.formError && <FormAlert message={form.formError} />}

      {step === 1 ? (
        <form noValidate onSubmit={next} className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            <AuthField
              {...field("email")}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@yourstore.com"
            />
            <AuthField
              {...field("phoneNumber")}
              label="Phone"
              type="tel"
              autoComplete="tel-national"
              placeholder="Enter phone number"
              leading={
                <select
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="mr-2 h-full cursor-pointer border-r border-line bg-transparent pr-1.5 text-sm font-semibold text-fg-strong outline-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              }
            />
            <PasswordField
              {...field("password")}
              label="Password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              visible={showPw}
              onToggleVisible={togglePw}
            />
            <PasswordField
              {...field("confirmPassword")}
              label="Confirm Password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              visible={showPw}
              onToggleVisible={togglePw}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-caption text-fg-muted">
              Already selling with us?{" "}
              <Link href="/vendor/login" className="font-bold">
                Log in
              </Link>
            </span>
            <button
              type="submit"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-[0.9375rem] font-semibold text-on-primary shadow-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Proceed To Next
              <ArrowRight aria-hidden className="size-[17px]" strokeWidth={2} />
            </button>
          </div>
        </form>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            <AuthField {...field("firstName")} label="First Name" autoComplete="given-name" placeholder="e.g. James" />
            <AuthField {...field("lastName")} label="Last Name" autoComplete="family-name" placeholder="e.g. Dawson" />
            <AuthField
              {...field("storeName")}
              label="Store Name"
              autoComplete="organization"
              placeholder="e.g. Hanover Electronics"
            />
            <AuthField
              {...field("storeAddress")}
              label="Store Address"
              autoComplete="street-address"
              placeholder="Street, city, ZIP"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-caption text-fg">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={values.acceptTerms}
                onChange={(e) => form.set("acceptTerms", e.target.checked)}
                aria-invalid={errors.acceptTerms ? true : undefined}
                aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
              />
              <span
                aria-hidden
                className={cn(
                  "mt-px grid size-[18px] shrink-0 place-items-center rounded-[5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                  values.acceptTerms
                    ? "bg-primary"
                    : cn("border-[1.5px]", errors.acceptTerms ? "border-error-500" : "border-line-default"),
                )}
              >
                {values.acceptTerms && <Check className="size-3 text-on-primary" strokeWidth={3} />}
              </span>
              <span>
                I agree to the <Link href="#">Seller Terms</Link> and <Link href="#">Privacy Policy</Link>.
                Payouts are processed securely through Stripe.
              </span>
            </label>
            {errors.acceptTerms && (
              <span id="terms-error" className="text-caption font-semibold text-error-600">
                {errors.acceptTerms}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                form.setErrors({});
                setStep(1);
              }}
              className="inline-flex h-12 items-center gap-2 rounded-md border border-line bg-card px-4.5 text-[0.9375rem] font-semibold text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowLeft aria-hidden className="size-[17px]" strokeWidth={2} />
              Back
            </button>
            <SubmitButton
              size="md"
              block={false}
              pending={form.pending}
              disabled={!values.acceptTerms}
              icon={Send}
              pendingLabel="Submitting…"
            >
              Submit Application
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
