"use client";

import { Check, CircleAlert, Eye, EyeOff, Info, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { changeVendorPassword } from "@/app/vendor/(panel)/change-password/actions";
import { PasswordMatchHint } from "@/components/auth/PasswordMatchHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PASSWORD_MIN, vendorPasswordSchema } from "@/lib/validations/vendor-profile";

type Field = "oldPassword" | "newPassword" | "confirmPassword";
const FIELDS: Field[] = ["oldPassword", "newPassword", "confirmPassword"];
const EMPTY: Record<Field, string> = { oldPassword: "", newPassword: "", confirmPassword: "" };
const RULE = `At least ${PASSWORD_MIN} characters, with a letter and a number.`;

/** Four-bar strength meter from the design: Weak → Fair → Good → Strong. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const tone = score <= 1 ? { bar: "bg-error-500", ink: "text-error-600" } : score === 2 ? { bar: "bg-warning-500", ink: "text-warning-600" } : score === 3 ? { bar: "bg-info-500", ink: "text-info-600" } : { bar: "bg-success-500", ink: "text-success-600" };
  return { score, label: `${["Weak", "Weak", "Fair", "Good", "Strong"][score]} password`, ...tone };
}

/**
 * Change Password card (vendorchangepassword design) plus the Old Password field. Zod runs here for
 * instant feedback and again in the server action, which also checks the old password and ends the
 * session. Every outcome is toasted; the typed values are kept on any failure.
 */
export function ChangePasswordForm() {
  const uid = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(EMPTY);
  const [shown, setShown] = useState<Record<Field, boolean>>({ oldPassword: false, newPassword: false, confirmPassword: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: Field, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const idOf = (k: Field) => `${uid}-${k}`;
  const meter = strength(values.newPassword);
  const busy = pending || done;

  function save() {
    if (busy) return;
    setTried(true);
    const parsed = vendorPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const i of parsed.error.issues) next[i.path[0] as Field] ??= i.message;
      setErrors(next);
      // Inline error on every field; the toast names the first one in form order.
      toast.error(FIELDS.map((k) => next[k]).find(Boolean) ?? "Please check the highlighted fields");
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        const res = await changeVendorPassword(parsed.data);
        if (!res.success) {
          setErrors(res.fieldErrors ?? {});
          toast.error(res.error ?? "We couldn't update your password.");
          return;
        }
        // The server already ended the session; send the vendor to sign in with the new password.
        setDone(true);
        toast.success("Password changed successfully. Please log in again.");
        router.replace("/vendor/login");
        router.refresh();
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  const field = (k: Field, label: string, placeholder: string, opts: { info?: string; extra?: React.ReactNode; invalid?: boolean } = {}) => {
    const describedBy = [opts.extra ? `${idOf(k)}-hint` : "", errors[k] ? `${idOf(k)}-error` : ""].filter(Boolean).join(" ");
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={idOf(k)} className="flex items-center gap-1.5 text-caption font-semibold text-fg">
          {label} <span aria-hidden className="text-error-500">*</span>
          {opts.info && (
            <span title={opts.info} className="inline-flex">
              <Info aria-hidden className="size-3.75 text-fg-muted" strokeWidth={2} />
            </span>
          )}
        </label>
        <div className="relative">
          <Input
            id={idOf(k)}
            name={k}
            type={shown[k] ? "text" : "password"}
            autoComplete={k === "oldPassword" ? "current-password" : "new-password"}
            placeholder={placeholder}
            value={values[k]}
            onChange={(e) => set(k, e.target.value)}
            readOnly={busy}
            aria-invalid={errors[k] || opts.invalid ? true : undefined}
            aria-describedby={describedBy || undefined}
            className="h-12 pr-12 focus-visible:shadow-[0_0_0_3px_var(--iris-100)]"
          />
          <button
            type="button"
            onClick={() => setShown((s) => ({ ...s, [k]: !s[k] }))}
            aria-label={shown[k] ? "Hide password" : "Show password"}
            aria-pressed={shown[k]}
            aria-controls={idOf(k)}
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-fg-muted transition-colors duration-(--dur-fast) hover:text-fg-strong focus-visible:outline-2 focus-visible:outline-primary max-lg:right-0.5 max-lg:size-11"
          >
            {shown[k] ? <EyeOff aria-hidden className="size-4.5" strokeWidth={2} /> : <Eye aria-hidden className="size-4.5" strokeWidth={2} />}
          </button>
        </div>
        {opts.extra && (
          <div id={`${idOf(k)}-hint`} className="flex flex-col gap-2">
            {opts.extra}
          </div>
        )}
        {errors[k] && (
          <span id={`${idOf(k)}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
            <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
            {errors[k]}
          </span>
        )}
      </div>
    );
  };

  const pw = values.newPassword;
  const short = pw.length < PASSWORD_MIN;
  const mismatch = values.confirmPassword.length > 0 && values.confirmPassword !== pw;

  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4.5 sm:px-6">
        <Lock aria-hidden className="size-5 shrink-0 text-fg-strong" strokeWidth={2} />
        <h2 className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-fg-strong">Change Password</h2>
      </div>
      <form
        noValidate
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="px-4 pt-5.5 pb-6 sm:px-6"
      >
        <div className="grid items-start gap-x-7 gap-y-4.5 sm:grid-cols-2">
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.875rem)]">{field("oldPassword", "Old Password", "Enter your old password")}</div>
          {field("newPassword", "New Password", "Enter new password", {
            info: RULE,
            invalid: tried && short,
            extra: (
              <>
                <span aria-hidden className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-(--dur-fast)", pw && i < meter.score ? meter.bar : "bg-line")} />
                  ))}
                </span>
                {!errors.newPassword && (
                  <span aria-live="polite" className={cn("text-caption font-semibold", !pw || (tried && short) ? "text-error-600" : short ? "text-fg-muted" : meter.ink)}>
                    {short ? RULE : meter.label}
                  </span>
                )}
              </>
            ),
          })}
          {field("confirmPassword", "Confirm Password", "Enter confirm password", {
            invalid: mismatch,
            extra: !errors.confirmPassword && values.confirmPassword ? <PasswordMatchHint password={pw} confirm={values.confirmPassword} /> : undefined,
          })}
        </div>
        <div className="mt-5.5 flex justify-end">
          <Button type="submit" disabled={busy} aria-busy={busy} className="h-12 w-full rounded-md px-6 shadow-xs sm:w-auto">
            {busy ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Check aria-hidden className="size-4.25" strokeWidth={2} />}
            {busy ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
