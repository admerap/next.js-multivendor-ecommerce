"use client";

import { Camera, CircleAlert, Info, KeyRound, Lock, Save, Store, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import toast from "react-hot-toast";
import { saveVendorProfile, type VendorProfileSnapshot } from "@/app/vendor/(panel)/profile/actions";
import { FileDrop } from "@/components/admin/vendors/FileDrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES, VENDOR_IMAGE_TYPES } from "@/lib/validations/admin-vendor";
import { STORE_ADDRESS_MAX, TIN_CERT_ACCEPT, splitPhone, todayIso, vendorProfileUpdateSchema } from "@/lib/validations/vendor-profile";

type CountryCode = (typeof COUNTRY_CODES)[number];
type Field =
  | "name" | "email" | "currentPassword" | "phone" | "photo"
  | "storeName" | "storeAddress" | "logo" | "coverImage" | "tinNumber" | "tinExpiresAt" | "tinCertificate";
const FLAGS: Record<CountryCode, string> = { "+1": "🇺🇸", "+44": "🇬🇧", "+33": "🇫🇷", "+52": "🇲🇽", "+34": "🇪🇸", "+91": "🇮🇳" };
const IMAGE_ACCEPT = VENDOR_IMAGE_TYPES.join(",");
const CERT_HREF = "/vendor/profile/tin-certificate";

type FormState = {
  name: string;
  email: string;
  currentPassword: string;
  countryCode: CountryCode;
  phone: string;
  storeName: string;
  storeAddress: string;
  tinNumber: string;
  tinExpiresAt: string;
};
const fromSnapshot = (s: VendorProfileSnapshot): FormState => {
  const { countryCode, phone } = splitPhone(s.phone);
  return { name: s.name, email: s.email, currentPassword: "", countryCode, phone, storeName: s.storeName, storeAddress: s.storeAddress, tinNumber: s.tinNumber ?? "", tinExpiresAt: s.tinExpiresAt ?? "" };
};

function SectionHeader({ icon: Icon, title, hint }: { icon: typeof UserRound; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-4.5 sm:px-6">
      <Icon aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={2} />
      <div className="min-w-0">
        <h2 className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-fg-strong">{title}</h2>
        {hint && <p className="mt-0.5 text-caption text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Seller Center › Profile Settings. One form, one submit: Basic Information (User) + Store Information
 * (Vendor) are saved together by `saveVendorProfile` in a single transaction.
 */
export function VendorProfileForm({ initial }: { initial: VendorProfileSnapshot }) {
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initial); // last saved values (baseline for "changed?")
  const [f, setF] = useState<FormState>(() => fromSnapshot(initial));
  const [files, setFiles] = useState<{ photo: File | null; logo: File | null; coverImage: File | null; tinCertificate: File | null }>({ photo: null, logo: null, coverImage: null, tinCertificate: null });
  const [remove, setRemove] = useState({ logo: false, coverImage: false });
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");

  const emailChanged = f.email.trim().toLowerCase() !== saved.email.toLowerCase();
  const expiryUnchanged = f.tinExpiresAt !== "" && f.tinExpiresAt === (saved.tinExpiresAt ?? "");
  const expiredOnFile = expiryUnchanged && f.tinExpiresAt < todayIso();

  // Same schema as the server. An unchanged expiry date isn't re-validated (it may be in the past).
  const parsed = vendorProfileUpdateSchema.safeParse({
    ...f,
    tinExpiresAt: expiryUnchanged ? "" : f.tinExpiresAt,
    photo: files.photo ?? undefined,
    logo: files.logo ?? undefined,
    coverImage: files.coverImage ?? undefined,
    tinCertificate: files.tinCertificate ?? undefined,
    removeLogo: remove.logo,
    removeCover: remove.coverImage,
  });
  const clientErrors: Partial<Record<Field, string>> = {};
  if (!parsed.success) for (const i of parsed.error.issues) clientErrors[i.path[0] as Field] ??= i.message;
  if (emailChanged && !f.currentPassword) clientErrors.currentPassword ??= "Enter your current password to change your email";
  const errorOf = (k: Field) => serverErrors[k] ?? (tried ? clientErrors[k] : undefined);
  const errorCount = new Set([...(tried ? Object.keys(clientErrors) : []), ...Object.keys(serverErrors)]).size;

  const photoPreview = useMemo(() => (files.photo ? URL.createObjectURL(files.photo) : null), [files.photo]);
  useEffect(() => () => void (photoPreview && URL.revokeObjectURL(photoPreview)), [photoPreview]);
  const shownPhoto = photoPreview ?? saved.photo;
  const initials = f.name.trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase() || "?";

  const touch = (k: Field) => {
    setServerErrors((e) => ({ ...e, [k]: undefined }));
    setFormError("");
  };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    touch(k as Field);
  };
  const setFile = (k: keyof typeof files, file: File | null) => {
    setFiles((x) => ({ ...x, [k]: file }));
    if (file && (k === "logo" || k === "coverImage")) setRemove((r) => ({ ...r, [k]: false }));
    touch(k);
  };

  const idOf = (k: Field) => `${uid}-${k}`;
  const a11y = (k: Field) => ({ id: idOf(k), "aria-invalid": errorOf(k) ? true : undefined, "aria-describedby": errorOf(k) ? `${idOf(k)}-error` : undefined });
  const errorText = (k: Field) =>
    errorOf(k) && (
      <span id={`${idOf(k)}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
        <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
        {errorOf(k)}
      </span>
    );
  const labelCls = "flex items-center gap-1.5 text-caption font-semibold text-fg";
  const req = <span aria-hidden className="text-error-500">*</span>;
  const textField = (k: Field & keyof FormState, label: string, props: React.ComponentProps<"input"> & { required?: boolean; after?: ReactNode } = {}) => {
    const { required = true, after, ...input } = props;
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={idOf(k)} className={labelCls}>
          {label} {required && req}
        </label>
        <Input {...a11y(k)} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} className="h-12" {...input} />
        {after}
        {errorText(k)}
      </div>
    );
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setTried(true);
    if (Object.keys(clientErrors).length) {
      toast.error("Please fix the highlighted fields");
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-profile-form] [aria-invalid="true"]')?.focus());
      return;
    }
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) fd.set(k, v);
    for (const [k, v] of Object.entries(files)) if (v) fd.set(k, v);
    fd.set("removeLogo", String(remove.logo));
    fd.set("removeCover", String(remove.coverImage));

    setServerErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const res = await saveVendorProfile(fd);
        if (!res.success || !res.data) {
          setServerErrors((res.fieldErrors ?? {}) as Partial<Record<Field, string>>); // keep every entry
          setFormError(res.error ?? "We couldn't save your profile.");
          toast.error(res.error ?? "We couldn't save your profile.");
          return;
        }
        setSaved(res.data);
        setF(fromSnapshot(res.data));
        setFiles({ photo: null, logo: null, coverImage: null, tinCertificate: null });
        setRemove({ logo: false, coverImage: false });
        setTried(false);
        toast.success("Profile updated");
        router.refresh(); // header name/email refresh; the shell is not re-mounted
      } catch {
        const msg = "We couldn't reach the server. Your changes are kept — try again.";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form noValidate onSubmit={submit} data-profile-form className="flex flex-col gap-5">
      {(formError || (tried && errorCount > 0)) && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-error-500 bg-error-50 px-4 py-3.5 text-error-600">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <b className="block text-sm">{errorCount > 0 ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} your attention` : "Couldn't save your profile"}</b>
            <span className="text-caption">{errorCount > 0 ? "Fix the highlighted fields below, then save again." : formError}</span>
          </div>
        </div>
      )}

      {/* ── Group A: Basic Information → User (vendorProfile design card) ── */}
      <section className="overflow-hidden rounded-lg bg-card shadow-sm">
        <div aria-hidden className="relative h-32 bg-linear-120 from-iris-50 via-card to-iris-100 sm:h-42">
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,var(--iris-200),transparent_45%),radial-gradient(circle_at_10%_90%,var(--saffron-50),transparent_40%)] opacity-60" />
        </div>
        <div className="relative -mt-14 flex flex-col items-center sm:-mt-17.5">
          <span className="relative grid size-28 place-items-center rounded-full border-3 border-primary bg-card shadow-md sm:size-35">
            {shownPhoto ? (
              <span role="img" aria-label="Profile photo" className="size-24 rounded-full bg-sunken bg-cover bg-center sm:size-30" style={{ backgroundImage: `url("${shownPhoto}")` }} />
            ) : (
              <span aria-hidden className="grid size-24 place-items-center rounded-full bg-iris-50 font-display text-h2 font-extrabold text-primary sm:size-30 sm:text-[2.5rem]">
                {initials}
              </span>
            )}
            <label className="absolute right-1 bottom-1 grid size-11 cursor-pointer place-items-center rounded-full bg-card text-fg shadow-md transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:text-primary sm:size-10" title="Change photo">
              <Camera aria-hidden className="size-4.5" strokeWidth={2} />
              <input
                {...a11y("photo")}
                type="file"
                accept={IMAGE_ACCEPT}
                aria-label="Change photo"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFile("photo", file);
                  e.target.value = "";
                }}
              />
            </label>
          </span>
          {files.photo && <p className="mt-2 text-caption text-fg-muted">New photo selected — save to apply it.</p>}
          <div className="mt-2 px-4">{errorText("photo")}</div>
        </div>

        <div className="mt-5">
          <SectionHeader icon={UserRound} title="Basic Information" />
        </div>
        <div className="grid gap-x-7 gap-y-4.5 px-4 pt-5.5 pb-6 sm:px-6 md:grid-cols-2">
          {textField("name", "Name", { maxLength: 60, autoComplete: "name", placeholder: "e.g. James Dawson" })}
          {textField("email", "Email", {
            type: "email",
            autoComplete: "email",
            after: emailChanged ? (
              <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                <Info aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
                This is your login email — confirm with your current password below.
              </span>
            ) : null,
          })}
          {emailChanged && (
            <div className="md:col-span-2 md:max-w-[calc(50%-0.875rem)] md:justify-self-end md:w-full">
              {textField("currentPassword", "Current password", {
                type: "password",
                autoComplete: "current-password",
                placeholder: "Needed to change your email",
                after: (
                  <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                    <Lock aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                    Only used to confirm it&apos;s you.
                  </span>
                ),
              })}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={idOf("phone")} className={labelCls}>
              Phone Number
            </label>
            <div
              className={cn(
                "flex h-12 items-stretch overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]",
                errorOf("phone") ? "border-[1.5px] border-error-500 shadow-[0_0_0_3px_var(--error-50)]" : "border-line",
              )}
            >
              <select
                aria-label="Country code"
                value={f.countryCode}
                onChange={(e) => set("countryCode", e.target.value as CountryCode)}
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
                autoComplete="tel-national"
                placeholder="(212) 555-0148"
                value={f.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
              />
            </div>
            {errorText("phone")}
          </div>
        </div>
      </section>

      {/* ── Group B: Store Information → Vendor (layout from adminaddvendor "Shop Information" + "Business TIN") ── */}
      <section className="overflow-hidden rounded-lg bg-card shadow-sm">
        <SectionHeader icon={Store} title="Store Information" hint="Shown on your storefront and used for verification and payouts." />
        <div className="flex flex-col gap-4 px-4 py-5.5 sm:px-6">
          <div className="grid gap-4.5 rounded-lg bg-sunken p-5 md:grid-cols-2">
            {textField("storeName", "Store name", { maxLength: 80, autoComplete: "organization", placeholder: "e.g. Hanover Electronics" })}
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={idOf("storeAddress")} className={labelCls}>
                Store address {req}
              </label>
              <textarea
                {...a11y("storeAddress")}
                rows={2}
                maxLength={STORE_ADDRESS_MAX}
                placeholder="Street, city, state, ZIP"
                value={f.storeAddress}
                onChange={(e) => set("storeAddress", e.target.value)}
                className="min-h-12 w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] aria-invalid:border-[1.5px] aria-invalid:border-error-500 aria-invalid:shadow-[0_0_0_3px_var(--error-50)]"
              />
              <span className="flex justify-between gap-2">
                <span className="flex-1">{errorText("storeAddress")}</span>
                <span className="text-caption text-fg-subtle tabular-nums">
                  {f.storeAddress.length}/{STORE_ADDRESS_MAX}
                </span>
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg bg-sunken p-5">
              <FileDrop
                label="Store logo"
                hint="JPG, PNG or WEBP · max 2 MB · 1:1"
                accept={IMAGE_ACCEPT}
                file={files.logo}
                onChange={(file) => setFile("logo", file)}
                currentUrl={remove.logo ? null : saved.logo}
                onRemoveCurrent={() => (setRemove((r) => ({ ...r, logo: true })), touch("logo"))}
                error={errorOf("logo")}
              />
              {remove.logo && <p className="mt-2 text-center text-caption text-fg-muted">The logo will be removed when you save.</p>}
            </div>
            <div className="rounded-lg bg-sunken p-5">
              <FileDrop
                label="Store cover image"
                hint="JPG, PNG or WEBP · max 2 MB · 4:1"
                accept={IMAGE_ACCEPT}
                aspect="wide"
                file={files.coverImage}
                onChange={(file) => setFile("coverImage", file)}
                currentUrl={remove.coverImage ? null : saved.coverImage}
                onRemoveCurrent={() => (setRemove((r) => ({ ...r, coverImage: true })), touch("coverImage"))}
                error={errorOf("coverImage")}
              />
              {remove.coverImage && <p className="mt-2 text-center text-caption text-fg-muted">The cover will be removed when you save.</p>}
            </div>
          </div>
        </div>

        <SectionHeader icon={KeyRound} title="Business TIN" hint="Taxpayer details used for vendor verification and Stripe payouts." />
        <div className="grid gap-4 px-4 py-5.5 sm:px-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(240px,1fr)]">
          <div className="flex flex-col gap-4.5 rounded-lg bg-sunken p-5">
            {textField("tinNumber", "Taxpayer identification number (TIN)", { required: false, maxLength: 40, autoComplete: "off", placeholder: "e.g. 12-3456789" })}
            {textField("tinExpiresAt", "Expiry date", {
              required: false,
              type: "date",
              min: expiryUnchanged ? undefined : todayIso(),
              after: expiredOnFile ? (
                <span role="status" className="flex items-center gap-1.5 text-caption font-semibold text-warning-600">
                  <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                  Expired — please update your TIN details.
                </span>
              ) : null,
            })}
          </div>
          <div className="rounded-lg bg-sunken p-5">
            <FileDrop
              label="TIN certificate"
              hint="PDF or image (JPG, PNG, WebP) · max 5 MB · private"
              accept={TIN_CERT_ACCEPT}
              kind="document"
              file={files.tinCertificate}
              onChange={(file) => setFile("tinCertificate", file)}
              currentHref={saved.hasTinCertificate ? CERT_HREF : null}
              error={errorOf("tinCertificate")}
            />
          </div>
        </div>
      </section>

      {/* One submit for both groups (saved together in one transaction) */}
      <div className="sticky bottom-0 z-5 -mx-1 flex items-center justify-end gap-3 rounded-lg border border-line bg-card px-3 py-2.5 shadow-lg sm:px-5 sm:py-3.5">
        <span className="mr-auto hidden text-caption text-fg-muted md:block">Basic and store information are saved together.</span>
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-12 w-full rounded-md px-6 sm:w-auto">
          {pending ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Save aria-hidden />}
          {pending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

