"use client";

import { Check, User } from "lucide-react";
import { AuthField, PasswordField } from "@/components/auth/AuthField";
import { FormAlert } from "@/components/auth/FormAlert";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { updateProfileAction } from "@/lib/actions/account";
import { profileSchema } from "@/lib/validations/account";

type Initial = { firstName: string; lastName: string; email: string; phone: string };

/** Profile Info form (user.dashboard design). Blank password fields keep the current password. */
export function ProfileForm({ initial }: { initial: Initial }) {
  const form = useAuthForm({ ...initial, currentPassword: "", newPassword: "", confirmPassword: "" });
  const { values, errors } = form;
  const displayName = [values.firstName, values.lastName].filter(Boolean).join(" ") || "Your name";

  const field = (key: keyof typeof values) => ({
    name: key,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => form.set(key, e.target.value),
    error: errors[key],
  });

  return (
    <>
      <div className="mt-4 mb-8 flex flex-col items-center gap-3">
        <span className="grid size-30 place-items-center overflow-hidden rounded-full bg-iris-50">
          <User aria-hidden className="size-16 text-iris-300" strokeWidth={1.6} />
        </span>
        <span className="font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong">{displayName}</span>
      </div>

      {form.formError && <FormAlert message={form.formError} />}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(profileSchema, async (v) => {
            const result = await updateProfileAction(v);
            if (result.ok) {
              form.set("currentPassword", "");
              form.set("newPassword", "");
              form.set("confirmPassword", "");
            }
            return result;
          });
        }}
      >
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <AuthField {...field("firstName")} label="First Name" autoComplete="given-name" />
          <AuthField {...field("lastName")} label="Last Name" autoComplete="family-name" />
          <AuthField {...field("phone")} label="Phone Number" type="tel" autoComplete="tel" placeholder="+1 555 555 5555" />
          <AuthField {...field("email")} label="Email" type="email" autoComplete="email" />
          <PasswordField
            {...field("newPassword")}
            label="New Password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters long"
          />
          <PasswordField
            {...field("confirmPassword")}
            label="Confirm Password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters long"
          />
          {values.newPassword && (
            <PasswordField
              {...field("currentPassword")}
              label="Current Password"
              autoComplete="current-password"
              placeholder="Needed to set a new password"
            />
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <SubmitButton block={false} pending={form.pending} icon={Check} pendingLabel="Updating…">
            Update
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
