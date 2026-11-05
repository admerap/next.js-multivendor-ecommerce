"use client";

import { KeyRound, Lock } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { PasswordField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { PasswordMatchHint } from "./PasswordMatchHint";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

/** New password + confirmation for a valid reset link. On success the action sends them to their login page. */
export function ResetPasswordForm({ token }: { token: string }) {
  const form = useAuthForm({ token, password: "", confirmPassword: "" });
  const { values, errors } = form;

  return (
    <>
      {form.formError && <FormAlert message={form.formError} />}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(resetPasswordSchema, (v) => resetPasswordAction(v));
        }}
      >
        <PasswordField
          label="New password"
          required
          icon={Lock}
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, a letter and a number"
          value={values.password}
          onChange={(e) => form.set("password", e.target.value)}
          error={errors.password}
        />
        <PasswordField
          label="Confirm new password"
          required
          icon={Lock}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Type it again"
          value={values.confirmPassword}
          onChange={(e) => form.set("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
          hint={<PasswordMatchHint password={values.password} confirm={values.confirmPassword} />}
        />
        <div className="mt-1">
          <SubmitButton pending={form.pending} icon={KeyRound} pendingLabel="Saving…">
            Save new password
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
