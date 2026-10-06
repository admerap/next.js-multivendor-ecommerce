"use client";

import { CircleAlert, Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { changeVendorPassword } from "@/app/vendor/(panel)/change-password/actions";
import { PasswordMatchHint } from "@/components/auth/PasswordMatchHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { vendorPasswordSchema } from "@/lib/validations/vendor-profile";

type Field = "currentPassword" | "newPassword" | "confirmPassword";

/** Four-bar strength meter from the design: Weak → Fair → Good → Strong. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const tone = score <= 1 ? { bar: "bg-error-500", ink: "text-error-600" } : score === 2 ? { bar: "bg-warning-500", ink: "text-warning-600" } : score === 3 ? { bar: "bg-info-500", ink: "text-info-600" } : { bar: "bg-success-500", ink: "text-success-600" };
  const label = pw.length < 8 ? "At least 8 characters." : `${["Weak", "Weak", "Fair", "Good", "Strong"][score]} password`;
  return { score, label, ...tone };
}

/** Change Password card (vendorchangepassword design), with the current password required for safety. */
export function ChangePasswordForm() {
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<Field, string>>({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [shown, setShown] = useState<Record<Field, boolean>>({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const set = (k: Field, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const idOf = (k: Field) => `${uid}-${k}`;
  const meter = strength(values.newPassword);

  function save() {
    if (pending) return;
    const parsed = vendorPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const i of parsed.error.issues) next[i.path[0] as Field] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        const res = await changeVendorPassword(values);
        if (!res.success) {
          setErrors((res.fieldErrors ?? {}) as Partial<Record<Field, string>>);
          toast.error(res.error ?? "We couldn't update your password.");
          return;
        }
        setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast.success("Password updated");
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  const field = (k: Field, label: string, placeholder: string, extra?: React.ReactNode) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={idOf(k)} className="flex items-center gap-1.5 text-caption font-semibold text-fg">
        {label} <span aria-hidden className="text-error-500">*</span>
      </label>
      <div className="relative">
        <Input
          id={idOf(k)}
          type={shown[k] ? "text" : "password"}
          autoComplete={k === "currentPassword" ? "current-password" : "new-password"}
          placeholder={placeholder}
          value={values[k]}
          onChange={(e) => set(k, e.target.value)}
          aria-invalid={errors[k] ? true : undefined}
          aria-describedby={errors[k] ? `${idOf(k)}-error` : undefined}
          className="h-12 pr-12"
        />
        <button
          type="button"
          onClick={() => setShown((s) => ({ ...s, [k]: !s[k] }))}
          aria-label={shown[k] ? "Hide password" : "Show password"}
          aria-pressed={shown[k]}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-fg-muted hover:text-fg-strong"
        >
          {shown[k] ? <EyeOff aria-hidden className="size-4.5" /> : <Eye aria-hidden className="size-4.5" />}
        </button>
      </div>
      {extra}
      {errors[k] && (
        <span id={`${idOf(k)}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {errors[k]}
        </span>
      )}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4.5 sm:px-6">
        <KeyRound aria-hidden className="size-5 text-primary" strokeWidth={2} />
        <h2 className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-fg-strong">Change Password</h2>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="px-4 pt-5.5 pb-6 sm:px-6"
      >
        <div className="grid gap-x-7 gap-y-4.5 md:grid-cols-2">
          <div className="md:col-span-2 md:max-w-[calc(50%-0.875rem)]">{field("currentPassword", "Current Password", "Enter your current password")}</div>
          {field(
            "newPassword",
            "New Password",
            "Enter new password",
            <>
              <span aria-hidden className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-(--dur-fast)", values.newPassword && i < meter.score ? meter.bar : "bg-line")} />
                ))}
              </span>
              <span aria-live="polite" className={cn("text-caption", !values.newPassword || values.newPassword.length < 8 ? "text-fg-muted" : meter.ink)}>
                {values.newPassword ? meter.label : "At least 8 characters, with a letter and a number."}
              </span>
            </>,
          )}
          {field(
            "confirmPassword",
            "Confirm Password",
            "Enter confirm password",
            !errors.confirmPassword && <PasswordMatchHint password={values.newPassword} confirm={values.confirmPassword} />,
          )}
        </div>
        <div className="mt-5.5 flex justify-end">
          <Button type="submit" disabled={pending} aria-busy={pending} className="h-12 w-full rounded-md px-6 sm:w-auto">
            {pending ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Save aria-hidden />}
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
