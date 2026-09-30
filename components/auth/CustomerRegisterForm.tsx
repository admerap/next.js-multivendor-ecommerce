"use client";

import { Lock, Mail, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { registerCustomerAction } from "@/lib/actions/auth";
import { customerRegisterSchema } from "@/lib/validations/auth";
import { AuthField, PasswordField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

export function CustomerRegisterForm() {
  const form = useAuthForm({ name: "", email: "", password: "" });
  const { values, errors } = form;

  return (
    <>
      {form.formError && <FormAlert message={form.formError} />}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(customerRegisterSchema, registerCustomerAction);
        }}
      >
        <AuthField
          label="Full Name"
          required
          icon={User}
          name="name"
          autoComplete="name"
          placeholder="Maya Chen"
          value={values.name}
          onChange={(e) => form.set("name", e.target.value)}
          error={errors.name}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password}
          onChange={(e) => form.set("password", e.target.value)}
          error={errors.password}
        />
        <p className="-mt-1 text-caption text-fg-muted">
          Use 8+ characters with a mix of letters and numbers. By creating an account you agree to our{" "}
          <Link href="#">Terms</Link> and <Link href="#">Privacy Policy</Link>.
        </p>
        <SubmitButton pending={form.pending} icon={UserPlus} pendingLabel="Creating account…">
          Create Account
        </SubmitButton>
      </form>
    </>
  );
}
