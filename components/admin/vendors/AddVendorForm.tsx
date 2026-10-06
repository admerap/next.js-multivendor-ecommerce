"use client";

import { CircleAlert, Eye, EyeOff, Info, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import toast from "react-hot-toast";
import { createVendor } from "@/app/admin/(panel)/vendors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordMatchHint } from "@/components/auth/PasswordMatchHint";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES, SHOP_ADDRESS_MAX, VENDOR_DOC_ACCEPT, VENDOR_IMAGE_TYPES, vendorCreateSchema } from "@/lib/validations/admin-vendor";
import { FileDrop } from "./FileDrop";

const TEXT_FIELDS = ["firstName", "lastName", "phone", "email", "password", "confirmPassword", "shopName", "shopAddress", "tinNumber", "tinExpiresAt"] as const;
const FILE_FIELDS = ["vendorImage", "logo", "coverImage", "tinCertificate"] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type FileField = (typeof FILE_FIELDS)[number];
type Field = TextField | FileField | "countryCode";

const FLAGS: Record<(typeof COUNTRY_CODES)[number], string> = { "+1": "🇺🇸", "+44": "🇬🇧", "+33": "🇫🇷", "+52": "🇲🇽", "+34": "🇪🇸", "+91": "🇮🇳" };
const IMAGE_ACCEPT = VENDOR_IMAGE_TYPES.join(",");
const emptyText = () => Object.fromEntries(TEXT_FIELDS.map((k) => [k, ""])) as Record<TextField, string>;
const emptyFiles = () => Object.fromEntries(FILE_FIELDS.map((k) => [k, null])) as Record<FileField, File | null>;

/** Password strength meter (design): Too short → Weak → Fair → Good → Strong. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too short", bar: "bg-error-500", ink: "text-error-500", width: "w-[15%]" },
    { label: "Weak", bar: "bg-error-500", ink: "text-error-500", width: "w-[30%]" },
    { label: "Fair", bar: "bg-warning-500", ink: "text-warning-500", width: "w-[55%]" },
    { label: "Good", bar: "bg-success-500", ink: "text-success-500", width: "w-[80%]" },
    { label: "Strong", bar: "bg-success-600", ink: "text-success-600", width: "w-full" },
  ];
  return levels[pw.length < 8 ? 0 : score];
}

function Section({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <header className="flex items-center gap-3.5 border-b border-line px-4 py-5 sm:px-6">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-iris-50 text-sm font-extrabold text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.2rem] font-extrabold tracking-[-0.01em] text-fg-strong">{title}</h2>
          <p className="mt-0.5 text-caption text-fg-muted">{description}</p>
        </div>
      </header>
      <div className="px-4 py-5.5 sm:px-6">{children}</div>
    </section>
  );
}

/** Admin › Add New Vendor (adminaddvendor design). Creates an APPROVED vendor, then opens its details. */
export function AddVendorForm() {
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(emptyText);
  const [countryCode, setCountryCode] = useState<(typeof COUNTRY_CODES)[number]>("+1");
  const [files, setFiles] = useState(emptyFiles);
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState({ password: false, confirm: false });

  const values = { ...text, countryCode, ...files };
  // Live validation once the admin has tried to save (same schema as the server).
  const parsed = vendorCreateSchema.safeParse({ ...values, tinCertificate: files.tinCertificate ?? undefined });
  const clientErrors: Partial<Record<Field, string>> = {};
  if (!parsed.success) for (const i of parsed.error.issues) clientErrors[i.path[0] as Field] ??= i.message;
  // Zod runs the "passwords match" refinement only once every field is valid; flag a mismatch right away.
  if (text.confirmPassword && text.password !== text.confirmPassword) clientErrors.confirmPassword ??= "Passwords don't match";
  const errorOf = (k: Field) => serverErrors[k] ?? (tried ? clientErrors[k] : undefined);
  const errorCount = new Set([...(tried ? Object.keys(clientErrors) : []), ...Object.keys(serverErrors).filter((k) => k !== "form")]).size;

  const idOf = (k: Field) => `${uid}-${k}`;
  const setField = (k: TextField, v: string) => {
    setText((t) => ({ ...t, [k]: v }));
    setServerErrors((e) => ({ ...e, [k]: undefined }));
    setFormError("");
  };
  const setFile = (k: FileField, f: File | null) => {
    setFiles((x) => ({ ...x, [k]: f }));
    setServerErrors((e) => ({ ...e, [k]: undefined }));
    setFormError("");
  };

  function reset() {
    setText(emptyText());
    setFiles(emptyFiles());
    setCountryCode("+1");
    setTried(false);
    setServerErrors({});
    setFormError("");
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-vendor-form] [aria-invalid="true"]');
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setTried(true);
    if (!parsed.success) {
      toast.error("Please complete the highlighted fields");
      focusFirstError();
      return;
    }

    const fd = new FormData();
    for (const k of TEXT_FIELDS) fd.set(k, text[k]);
    fd.set("countryCode", countryCode);
    for (const k of FILE_FIELDS) if (files[k]) fd.set(k, files[k]);

    setServerErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const res = await createVendor(fd);
        if (!res.success || !res.data) {
          // Keep every entry; show the server's message on the field it belongs to.
          setServerErrors((res.fieldErrors ?? {}) as Partial<Record<Field, string>>);
          setFormError(res.error ?? "We couldn't create the vendor.");
          toast.error(res.error ?? "We couldn't create the vendor.");
          focusFirstError();
          return;
        }
        toast.success(`Vendor “${text.shopName.trim()}” created`);
        router.push(`/admin/vendors/${res.data.id}`);
      } catch {
        const msg = "We couldn't reach the server. Your entries are kept — try again.";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  const errorText = (k: Field) => {
    const msg = errorOf(k);
    return (
      msg && (
        <span id={`${idOf(k)}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {msg}
        </span>
      )
    );
  };
  const req = <span aria-hidden className="text-error-500">*</span>;
  const labelCls = "flex items-center gap-1.5 text-caption font-semibold text-fg";
  const a11y = (k: Field) => ({ id: idOf(k), "aria-invalid": errorOf(k) ? true : undefined, "aria-describedby": errorOf(k) ? `${idOf(k)}-error` : undefined });

  const textInput = (k: TextField, label: string, props: React.ComponentProps<"input"> & { required?: boolean } = {}) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={idOf(k)} className={labelCls}>
        {label} {props.required !== false && req}
      </label>
      <Input {...a11y(k)} value={text[k]} onChange={(e) => setField(k, e.target.value)} {...props} required={undefined} />
      {errorText(k)}
    </div>
  );

  const passwordInput = (k: "password" | "confirmPassword", label: string, placeholder: string, toggle: "password" | "confirm", extra?: ReactNode) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={idOf(k)} className={labelCls}>
        {label} {req}
        {extra}
      </label>
      <div className="relative">
        <Input
          {...a11y(k)}
          type={show[toggle] ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={text[k]}
          onChange={(e) => setField(k, e.target.value)}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [toggle]: !s[toggle] }))}
          aria-label={show[toggle] ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-fg-muted hover:text-fg-strong"
        >
          {show[toggle] ? <EyeOff aria-hidden className="size-4.5" /> : <Eye aria-hidden className="size-4.5" />}
        </button>
      </div>
      {k === "password" && text.password && (
        <span className="flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
            <span className={cn("block h-full rounded-full transition-[width] duration-(--dur-med)", strength(text.password).bar, strength(text.password).width)} />
          </span>
          <span className={cn("text-caption font-bold", strength(text.password).ink)}>{strength(text.password).label}</span>
        </span>
      )}
      {k === "confirmPassword" && !errorOf(k) && <PasswordMatchHint password={text.password} confirm={text.confirmPassword} />}
      {errorText(k)}
    </div>
  );

  const showBanner = !!formError || (tried && errorCount > 0);

  return (
    <form noValidate onSubmit={submit} data-vendor-form className="flex flex-col gap-5">
      {showBanner && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-error-500 bg-error-50 px-4 py-3.5 text-error-600">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <b className="block text-sm">
              {errorCount > 0 ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} your attention` : "Couldn't save this vendor"}
            </b>
            <span className="text-caption">{errorCount > 0 ? "Fix the highlighted fields below, then save again." : formError}</span>
          </div>
        </div>
      )}

      <Section step={1} title="Vendor Information" description="Provide all mandatory details to create a new vendor profile.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(240px,1fr)]">
          <div className="grid content-start gap-4.5 rounded-lg bg-sunken p-5 sm:grid-cols-2">
            {textInput("firstName", "First name", { placeholder: "e.g. James", autoComplete: "off", maxLength: 50 })}
            {textInput("lastName", "Last name", { placeholder: "e.g. Dawson", autoComplete: "off", maxLength: 50 })}
            <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
              <label htmlFor={idOf("phone")} className={labelCls}>
                Phone {req}
              </label>
              <div
                className={cn(
                  "flex h-11.5 items-stretch overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]",
                  errorOf("phone") ? "border-[1.5px] border-error-500 shadow-[0_0_0_3px_var(--error-50)]" : "border-line",
                )}
              >
                <select
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value as (typeof COUNTRY_CODES)[number])}
                  className="shrink-0 cursor-pointer border-r border-line bg-sunken px-2.5 text-sm font-semibold text-fg-strong outline-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {FLAGS[c]} {c}
                    </option>
                  ))}
                </select>
                <input
                  {...a11y("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="(555) 014-2233"
                  value={text.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
                />
              </div>
              {errorText("phone")}
            </div>
          </div>
          <div className="rounded-lg bg-sunken p-5">
            <FileDrop
              label="Vendor image"
              hint="JPG, PNG or WEBP · max 1 MB · 1:1"
              accept={IMAGE_ACCEPT}
              file={files.vendorImage}
              onChange={(f) => setFile("vendorImage", f)}
              error={errorOf("vendorImage")}
              required
            />
          </div>
        </div>
      </Section>

      <Section step={2} title="Account Information" description="Login credentials the vendor will use for the seller panel.">
        <div className="grid gap-4.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2 xl:col-span-1">{textInput("email", "Email", { type: "email", placeholder: "name@store.com", autoComplete: "off" })}</div>
          {passwordInput(
            "password",
            "Password",
            "Minimum 8 characters",
            "password",
            <span aria-hidden title="Use 8+ characters with letters and numbers" className="grid size-4 cursor-help place-items-center rounded-full bg-sunken text-[0.6rem] font-extrabold text-fg-muted">
              i
            </span>,
          )}
          {passwordInput("confirmPassword", "Confirm password", "Re-enter password", "confirm")}
        </div>
        <p className="mt-4 flex items-start gap-2.5 rounded-md bg-iris-50 px-3.5 py-3 text-caption text-fg">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
          <span>
            This is a <b>temporary password</b>. Share it with the vendor securely — they sign in at <b>/vendor/login</b> and should change it right away.
          </span>
        </p>
      </Section>

      <Section step={3} title="Shop Information" description="Basic shop details shown on the storefront.">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4.5 rounded-lg bg-sunken p-5 sm:grid-cols-2">
            {textInput("shopName", "Shop name", { placeholder: "e.g. Hanover Electronics", autoComplete: "off", maxLength: 80 })}
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={idOf("shopAddress")} className={labelCls}>
                Shop address {req}
              </label>
              <textarea
                {...a11y("shopAddress")}
                rows={2}
                maxLength={SHOP_ADDRESS_MAX}
                placeholder="Street, city, state, ZIP"
                value={text.shopAddress}
                onChange={(e) => setField("shopAddress", e.target.value)}
                className="min-h-11.5 w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] aria-invalid:border-[1.5px] aria-invalid:border-error-500 aria-invalid:shadow-[0_0_0_3px_var(--error-50)]"
              />
              <span className="flex justify-between gap-2">
                <span className="flex-1">{errorText("shopAddress")}</span>
                <span className="text-caption text-fg-subtle tabular-nums">
                  {text.shopAddress.length}/{SHOP_ADDRESS_MAX}
                </span>
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg bg-sunken p-5">
              <FileDrop label="Shop logo" hint="JPG, PNG or WEBP · max 1 MB · 1:1" accept={IMAGE_ACCEPT} file={files.logo} onChange={(f) => setFile("logo", f)} error={errorOf("logo")} required />
            </div>
            <div className="rounded-lg bg-sunken p-5">
              <FileDrop
                label="Shop cover image"
                hint="JPG, PNG or WEBP · max 1 MB · 4:1"
                accept={IMAGE_ACCEPT}
                aspect="wide"
                file={files.coverImage}
                onChange={(f) => setFile("coverImage", f)}
                error={errorOf("coverImage")}
                required
              />
            </div>
          </div>
        </div>
      </Section>

      <Section step={4} title="Business TIN" description="Taxpayer details used for vendor verification and Stripe payouts.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(240px,1fr)]">
          <div className="flex flex-col gap-4.5 rounded-lg bg-sunken p-5">
            {textInput("tinNumber", "Taxpayer identification number (TIN)", { placeholder: "e.g. 12-3456789", autoComplete: "off", maxLength: 40, required: false })}
            {textInput("tinExpiresAt", "Expiry date", { type: "date", required: false })}
          </div>
          <div className="rounded-lg bg-sunken p-5">
            <FileDrop
              label="TIN certificate"
              hint="PDF, DOC, DOCX or JPG · max 1 MB"
              accept={VENDOR_DOC_ACCEPT}
              kind="document"
              file={files.tinCertificate}
              onChange={(f) => setFile("tinCertificate", f)}
              error={errorOf("tinCertificate")}
            />
          </div>
        </div>
      </Section>

      {/* Sticky action bar (design) */}
      <div className="sticky bottom-0 z-5 -mx-1 flex items-center justify-end gap-2 rounded-lg border border-line bg-card px-3 py-2.5 shadow-lg sm:gap-3 sm:px-5 sm:py-3.5">
        <span className="mr-auto hidden text-caption text-fg-muted md:block">
          {tried && errorCount ? `${errorCount} required ${errorCount === 1 ? "field" : "fields"} missing` : "Changes are not saved until you click Save vendor"}
        </span>
        <Button type="button" variant="secondary" disabled={pending} onClick={reset}>
          <RotateCcw aria-hidden />
          Reset
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Save aria-hidden />}
          {pending ? "Saving…" : "Save vendor"}
        </Button>
      </div>
    </form>
  );
}
