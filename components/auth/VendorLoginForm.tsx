"use client";

import { LogIn, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validations/auth";
import { AuthField, PasswordField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

/** Seller Center sign-in (vendorLogin design): larger 56px fields, register link under the password. */
export function VendorLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const form = useAuthForm({ email: "", password: "" });
  const { values, errors } = form;

  return (
    <>
      {form.formError && <FormAlert variant="seller" message={form.formError} />}
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(loginSchema, (v) => loginAction(v, callbackUrl));
        }}
      >
        <AuthField
          size="lg"
          errorIcon={false}
          label="Your Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="username"
          placeholder="email@address.com"
          value={values.email}
          onChange={(e) => form.set("email", e.target.value)}
          error={errors.email}
        />
        <PasswordField
          size="lg"
          errorIcon={false}
          label="Password"
          icon={Lock}
          name="password"
          autoComplete="current-password"
          placeholder="8+ characters required"
          value={values.password}
          onChange={(e) => form.set("password", e.target.value)}
          error={errors.password}
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href="/vendor/register" className="text-sm font-semibold">
            Register New Account
          </Link>
        </div>
        <SubmitButton size="xl" pending={form.pending} icon={LogIn} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </>
  );
}
