import { z } from "zod";
import { COUNTRY_CODES, VENDOR_IMAGE_TYPES } from "./admin-vendor";
import { passwordRules } from "./auth";

/** Seller Center › Profile Settings (vendorProfile design). Shared by the form and the server actions. */

const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 && !v.name ? undefined : v);

/** Splits a stored "+1 (212) 555-0148" into the country-code select and the number. */
export function splitPhone(stored: string | null | undefined): { countryCode: (typeof COUNTRY_CODES)[number]; phone: string } {
  const value = (stored ?? "").trim();
  const code = [...COUNTRY_CODES].sort((a, b) => b.length - a.length).find((c) => value.startsWith(`${c} `) || value === c);
  return code ? { countryCode: code, phone: value.slice(code.length).trim() } : { countryCode: "+1", phone: value };
}

// ── Full profile update (Basic Information → User · Store Information → Vendor) ─────────────────

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // logo, cover, photo
export const TIN_CERT_MAX_BYTES = 5 * 1024 * 1024;
export const TIN_CERT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const TIN_CERT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
export const STORE_ADDRESS_MAX = 255;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const flag = z.preprocess((v) => v === true || v === "true" || v === "1", z.boolean());

const optionalImage = (what: string) =>
  z.preprocess(
    noEmptyFile,
    z
      .file()
      .max(PROFILE_IMAGE_MAX_BYTES, `${what} must be 2 MB or smaller`)
      .mime([...VENDOR_IMAGE_TYPES], "Use a JPG, PNG or WebP image")
      .optional(),
  );

/** Today as YYYY-MM-DD in the server/browser's local time (dates from <input type="date"> are local). */
export function todayIso(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * One submit, two tables. Optional files mean "keep the current one"; `remove*` flags clear them.
 * `currentPassword` is required by the server only when the email actually changes.
 */
export const vendorProfileUpdateSchema = z
  .object({
    // Group A — Basic Information → User
    name: z.string("Enter your name").trim().min(1, "Enter your name").min(2, "Use at least 2 characters").max(60, "Use 60 characters or fewer"),
    email: z.string("Enter your email").trim().toLowerCase().min(1, "Enter your email").pipe(z.email("Enter a valid email, like name@store.com")),
    currentPassword: z.preprocess(emptyToUndefined, z.string().max(72).optional()),
    countryCode: z.enum(COUNTRY_CODES, "Choose a country code"),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[0-9\s\-().]+$/.test(v), "Use digits only")
      .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "Phone number looks too short")
      .refine((v) => v.replace(/\D/g, "").length <= 15, "Phone number looks too long"),
    photo: optionalImage("Photo"),

    // Group B — Store Information → Vendor
    storeName: z.string("Enter your store name").trim().min(1, "Enter your store name").min(2, "Use at least 2 characters").max(80, "Use 80 characters or fewer"),
    storeAddress: z
      .string("Enter your store address")
      .trim()
      .min(5, "Enter your store address")
      .max(STORE_ADDRESS_MAX, `Use ${STORE_ADDRESS_MAX} characters or fewer`),
    logo: optionalImage("Logo"),
    removeLogo: flag,
    coverImage: optionalImage("Cover image"),
    removeCover: flag,
    tinNumber: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9][A-Za-z0-9\s-]{3,39}$/, "Use 4–40 letters, numbers, spaces or dashes")
        .optional(),
    ),
    tinExpiresAt: z.preprocess(
      emptyToUndefined,
      z.iso
        .date("Enter a valid date")
        .refine((d) => d >= todayIso(), "The expiry date can't be in the past")
        .optional(),
    ),
    tinCertificate: z.preprocess(
      noEmptyFile,
      z
        .file()
        .max(TIN_CERT_MAX_BYTES, "Certificate must be 5 MB or smaller")
        .mime([...TIN_CERT_TYPES], "Use a PDF or an image (JPG, PNG, WebP)")
        .optional(),
    ),
  })
  .refine((d) => !(d.logo && d.removeLogo), { path: ["logo"], message: "Choose a new logo or remove it, not both" })
  .refine((d) => !(d.coverImage && d.removeCover), { path: ["coverImage"], message: "Choose a new cover or remove it, not both" });

export type VendorProfileUpdateInput = z.infer<typeof vendorProfileUpdateSchema>;

// ── Change password (vendorchangepassword design + current password for safety) ──

export const vendorPasswordSchema = z
  .object({
    currentPassword: z.string("Enter your current password").min(1, "Enter your current password").max(72),
    newPassword: passwordRules,
    confirmPassword: z.string("Please confirm your password").min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "Choose a password different from your current one" });

export type VendorPasswordInput = z.infer<typeof vendorPasswordSchema>;
