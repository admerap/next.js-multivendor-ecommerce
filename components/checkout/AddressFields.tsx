"use client";

import { Briefcase, ChevronDown, Home, MapPin } from "lucide-react";
import { Field } from "@/components/forms/FormBits";
import { REGION } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { ADDRESS_TYPE_LABEL, ADDRESS_TYPES, COUNTRIES, type AddressInput } from "@/lib/validations/checkout";

const TYPE_ICON = { HOME: Home, OFFICE: Briefcase, OTHER: MapPin } as const;
const ZIP_EXAMPLE: Record<keyof typeof REGION, string> = { "United States": "e.g. 06901", Canada: "e.g. M5V 2T6", "United Kingdom": "e.g. SW1A 1AA" };

const control =
  "h-11 w-full min-w-0 rounded-md border border-line bg-card px-3.5 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500";

/**
 * One address card (Checkout Page design): contact name, phone, email, address type, country,
 * state / province / county (follows the country), city, zip, street address + optional apt / suite / unit. Controlled; `errors` are keyed by field name ("city"…), shown inline under each field.
 * Also My Address (useraddress design): `withEmail={false}` (the account has the email), `typePills` (Home / Office /
 * Other as buttons on top) and `bare` (no card or title — it sits in the page's card).
 */
export function AddressFields({
  idPrefix,
  title,
  value,
  errors,
  onChange,
  withEmail = true,
  typePills = false,
  bare = false,
}: {
  idPrefix: string;
  title: string;
  value: Partial<AddressInput>;
  errors: Record<string, string>;
  onChange: (patch: Partial<AddressInput>) => void;
  withEmail?: boolean;
  typePills?: boolean;
  bare?: boolean;
}) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const country = (value.country ?? "United States") as keyof typeof REGION;
  const region = REGION[country] ?? REGION["United States"];
  const a11y = (k: string) => ({ id: id(k), "aria-invalid": !!errors[k] || undefined, "aria-describedby": errors[k] ? `${id(k)}-error` : undefined });

  return (
    <fieldset className={bare ? "min-w-0" : "rounded-lg bg-card p-5 shadow-sm sm:p-6"}>
      <legend className="sr-only">{title}</legend>
      {!bare && (
        <h3 aria-hidden className="mb-5 border-b border-line pb-3.5 font-display text-[1.06rem] font-extrabold text-fg-strong">
          {title}
        </h3>
      )}
      {typePills && (
        <div role="radiogroup" aria-label="Address type" className="mb-4 flex gap-2.5">
          {ADDRESS_TYPES.map((t) => {
            const on = (value.type ?? "HOME") === t;
            const Icon = TYPE_ICON[t];
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ type: t })}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors duration-(--dur-fast)",
                  on ? "border-primary bg-iris-50 text-primary" : "border-line bg-card text-fg hover:border-primary",
                )}
              >
                <Icon aria-hidden className="size-4" strokeWidth={2} />
                {ADDRESS_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field id={id("name")} label="Contact person name" required error={errors.name}>
          <input
            {...a11y("name")}
            value={value.name ?? ""}
            onChange={(e) => onChange({ name: e.target.value })}
            autoComplete="name"
            maxLength={120}
            className={control}
          />
        </Field>
        <Field id={id("phone")} label="Phone" required error={errors.phone}>
          <input
            {...a11y("phone")}
            type="tel"
            value={value.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            autoComplete="tel"
            placeholder="+1 (___) ___-____"
            maxLength={24}
            className={control}
          />
        </Field>
        {withEmail && (
          <Field id={id("email")} label="Email" required error={errors.email}>
            <input
              {...a11y("email")}
              type="email"
              value={value.email ?? ""}
              onChange={(e) => onChange({ email: e.target.value })}
              autoComplete="email"
              maxLength={191}
              className={control}
            />
          </Field>
        )}
        {!typePills && (
          <Field id={id("type")} label="Address type" error={errors.type}>
            <Select
              {...a11y("type")}
              value={value.type ?? "HOME"}
              onChange={(v) => onChange({ type: v as AddressInput["type"] })}
              options={ADDRESS_TYPES.map((t) => ({ value: t, label: ADDRESS_TYPE_LABEL[t] }))}
            />
          </Field>
        )}
        <Field id={id("country")} label="Country" required error={errors.country}>
          {/* A new country has other states / provinces → the old one no longer applies. */}
          <Select
            {...a11y("country")}
            value={value.country ?? ""}
            onChange={(v) => onChange({ country: v as AddressInput["country"], state: "" })}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field id={id("state")} label={region.label} required={region.required} error={errors.state}>
          {region.options ? (
            <Select
              {...a11y("state")}
              value={value.state ?? ""}
              onChange={(v) => onChange({ state: v })}
              options={[
                { value: "", label: `Select a ${region.label.toLowerCase()}` },
                ...region.options.map(([code, name]) => ({ value: code, label: name })),
              ]}
            />
          ) : (
            <input
              {...a11y("state")}
              value={value.state ?? ""}
              onChange={(e) => onChange({ state: e.target.value })}
              autoComplete="address-level1"
              maxLength={60}
              placeholder="Optional"
              className={control}
            />
          )}
        </Field>
        <Field id={id("city")} label="City" required error={errors.city}>
          <input
            {...a11y("city")}
            value={value.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            autoComplete="address-level2"
            maxLength={120}
            className={control}
          />
        </Field>
        <Field id={id("zip")} label="Zip code" required error={errors.zip}>
          <input
            {...a11y("zip")}
            value={value.zip ?? ""}
            onChange={(e) => onChange({ zip: e.target.value })}
            autoComplete="postal-code"
            maxLength={10}
            placeholder={ZIP_EXAMPLE[country]}
            className={cn(control, "uppercase placeholder:normal-case")}
          />
        </Field>
        <Field id={id("address")} label="Street address" required error={errors.address} className="sm:col-span-2">
          <input
            {...a11y("address")}
            value={value.address ?? ""}
            onChange={(e) => onChange({ address: e.target.value })}
            autoComplete="address-line1"
            maxLength={500}
            placeholder="House number and street name"
            className={control}
          />
        </Field>
        <Field id={id("address2")} label="Apt, suite, unit (optional)" error={errors.address2} className="sm:col-span-2">
          <input
            {...a11y("address2")}
            value={value.address2 ?? ""}
            onChange={(e) => onChange({ address2: e.target.value })}
            autoComplete="address-line2"
            maxLength={100}
            placeholder="Apartment, suite, unit, floor…"
            className={control}
          />
        </Field>
      </div>
    </fieldset>
  );
}

function Select({
  options,
  onChange,
  ...props
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <div className="relative">
      <select {...props} onChange={(e) => onChange(e.target.value)} className={cn(control, "cursor-pointer appearance-none pr-10")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" strokeWidth={2} />
    </div>
  );
}
