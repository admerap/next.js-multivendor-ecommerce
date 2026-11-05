"use client";

import { LogIn, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import type { ExpiredReason } from "@/lib/session-policy";
import { loginSchema } from "@/lib/validations/auth";
import { AuthField, PasswordField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SessionExpiredNotice } from "./SessionExpiredNotice";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

/**
 * Email + password form used by the customer and admin sign-in cards. `area` picks the "Forgot password?" page
 * (its back link and wording); `expired` / `passwordReset` show why they're here.
 */
export function LoginForm({ callbackUrl, expired, passwordReset, area = "customer" }: { callbackUrl?: string; expired?: ExpiredReason; passwordReset?: boolean; area?: "customer" | "admin" }) {
  const form = useAuthForm({ email: "", password: "" });
  const { values, errors } = form;

  return (
    <>
      {!form.formError && <SessionExpiredNotice reason={expired} passwordReset={passwordReset} />}
      {form.formError && <FormAlert message={form.formError} />}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(loginSchema, (v) => loginAction(v, callbackUrl));
        }}
      >
        <AuthField
          label="Email"
          required
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => form.set("email", e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          required
          icon={Lock}
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={(e) => form.set("password", e.target.value)}
          error={errors.password}
        />
        <Link href={`/forgot-password?area=${area}`} className="-mt-1 inline-flex items-center self-end text-sm font-semibold max-lg:min-h-11">
          Forgot password?
        </Link>
        <div className="mt-1">
          <SubmitButton pending={form.pending} icon={LogIn} pendingLabel="Signing in…">
            Sign In
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
