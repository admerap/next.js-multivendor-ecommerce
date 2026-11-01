"use client";

import { Check } from "lucide-react";
import { AvatarPicker } from "@/components/account/AvatarPicker";
import { AuthField } from "@/components/auth/AuthField";
import { FormAlert } from "@/components/auth/FormAlert";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { updateProfileAction } from "@/lib/actions/account";
import { profileSchema } from "@/lib/validations/account";
import { COUNTRY_CODES } from "@/lib/validations/admin-vendor";

type CountryCode = (typeof COUNTRY_CODES)[number];

type Initial = { firstName: string; lastName: string; email: string; countryCode: CountryCode; phone: string };

/** Profile Info form (user.dashboard design): photo, name, phone, email. The password has its own card. */
export function ProfileForm({ initial, image }: { initial: Initial; image: string | null }) {
  const form = useAuthForm(initial);
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
        <AvatarPicker image={image} name={displayName} />
        <span className="font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong">{displayName}</span>
      </div>

      {form.formError && <FormAlert message={form.formError} />}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(profileSchema, async (v) => {
            return updateProfileAction(v);
          });
        }}
      >
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <AuthField {...field("firstName")} label="First Name" autoComplete="given-name" />
          <AuthField {...field("lastName")} label="Last Name" autoComplete="family-name" />
          <AuthField
            {...field("phone")}
            label="Phone Number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="555 555 5555"
            leading={
              <select
                aria-label="Country code"
                value={values.countryCode}
                onChange={(e) => form.set("countryCode", e.target.value as CountryCode)}
                className="mr-3 h-8 shrink-0 cursor-pointer border-r border-line bg-transparent pr-2 text-sm font-semibold text-fg-strong outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            }
          />
          <AuthField {...field("email")} label="Email" type="email" autoComplete="email" />
        </div>

        <div className="mt-8">
          <SubmitButton pending={form.pending} icon={Check} pendingLabel="Updating…">
            Update
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
