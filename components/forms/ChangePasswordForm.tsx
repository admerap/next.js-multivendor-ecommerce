"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { PasswordField } from "@/components/auth/AuthField";
import { PasswordMatchHint } from "@/components/auth/PasswordMatchHint";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { PasswordActionResult } from "@/lib/password.server";
import { changePasswordSchema, PASSWORD_MIN } from "@/lib/validations/account";

type Field = "oldPassword" | "newPassword" | "confirmPassword";
const FIELDS: Field[] = ["oldPassword", "newPassword", "confirmPassword"];
const EMPTY: Record<Field, string> = { oldPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Change Password form, shared by the customer account (Change Password page) and the admin Profile page: laid
 * out like Profile Info — two-column fields and the
 * Update button on the right. Same rules and server core as the vendor (lib/password.server): all
 * three fields required, current password checked on the server, new ≠ current, confirmation
 * matches, 8+ characters with a letter and a number. Zod runs here for instant feedback and again on
 * the server. Every outcome is toasted; on success the session has ended and they sign in
 * again with the new password at `signInHref`. `action`: the area's own Server Action (it reads the id from the
 * session).
 */
export function ChangePasswordForm({ action, signInHref }: { action: (input: unknown) => Promise<PasswordActionResult>; signInHref: string }) {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const busy = pending || done;

  const field = (k: Field) => ({
    name: k,
    value: values[k],
    error: errors[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [k]: e.target.value }));
      setErrors((x) => ({ ...x, [k]: undefined }));
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const i of parsed.error.issues) next[i.path[0] as Field] ??= i.message;
      setErrors(next);
      toast.error(FIELDS.map((k) => next[k]).find(Boolean) ?? "Please check the highlighted fields");
      return;
    }
    setErrors({});
    start(async () => {
      const res = await action(parsed.data).catch(() => ({ success: false, error: "We couldn't reach the server. Please try again.", fieldErrors: undefined }));
      if (!res.success) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error ?? "We couldn't update your password.");
        return;
      }
      // The server already ended the session — sign in again with the new password.
      setDone(true);
      toast.success("Password changed successfully. Please log in again.");
      router.replace(signInHref);
      router.refresh();
    });
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <PasswordField {...field("oldPassword")} label="Current Password" autoComplete="current-password" placeholder="Enter your current password" />
        <div aria-hidden className="max-sm:hidden" />
        <PasswordField
          {...field("newPassword")}
          label="New Password"
          autoComplete="new-password"
          placeholder={`Minimum ${PASSWORD_MIN} characters long`}
          hint={<span className="text-caption text-fg-subtle">Use {PASSWORD_MIN}+ characters with a letter and a number.</span>}
        />
        <PasswordField
          {...field("confirmPassword")}
          label="Confirm Password"
          autoComplete="new-password"
          placeholder={`Minimum ${PASSWORD_MIN} characters long`}
          hint={<PasswordMatchHint password={values.newPassword} confirm={values.confirmPassword} />}
        />
      </div>

      <div className="mt-8">
        <SubmitButton pending={busy} icon={Check} pendingLabel={done ? "Signing you out…" : "Updating…"}>
          Update
        </SubmitButton>
      </div>
    </form>
  );
}
