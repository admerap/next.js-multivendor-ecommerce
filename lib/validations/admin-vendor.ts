import { z } from "zod";

/** Admin › Vendor Manage validation (list params, ids, status changes). */

export const VENDOR_STATUSES = ["PENDING", "APPROVED", "SUSPENDED"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_SORTS = ["newest", "oldest", "name"] as const;
export const VENDOR_SORT_LABELS: Record<(typeof VENDOR_SORTS)[number], string> = { newest: "Newest first", oldest: "Oldest first", name: "Shop name A–Z" };

/** List params from the URL. Bad values fall back to defaults instead of failing the page. */
export const vendorListSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["ALL", ...VENDOR_STATUSES]).catch("ALL"),
  /** Vendor List sort (design). TODO(catalog): add "products" / "orders" once those counts exist. */
  sort: z.enum(VENDOR_SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});

export const vendorIdSchema = z.object({ id: z.string().trim().min(1, "Invalid vendor") });

/**
 * Approve: PENDING / SUSPENDED → APPROVED.
 * Suspend: PENDING / APPROVED → SUSPENDED (a pending application can be turned down directly).
 */
export const vendorStatusActionSchema = z.object({
  id: z.string().trim().min(1, "Invalid vendor"),
  action: z.enum(["APPROVE", "SUSPEND"], "Invalid action"),
});

export const VENDOR_TRANSITIONS: Record<z.infer<typeof vendorStatusActionSchema>["action"], { from: VendorStatus[]; to: VendorStatus }> = {
  APPROVE: { from: ["PENDING", "SUSPENDED"], to: "APPROVED" },
  SUSPEND: { from: ["PENDING", "APPROVED"], to: "SUSPENDED" },
};

// ── Add New Vendor (adminaddvendor design) ───────────────────────────────────

export const VENDOR_FILE_MAX_BYTES = 1024 * 1024; // design: "max 1 MB"
export const VENDOR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VENDOR_DOC_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg";
export const COUNTRY_CODES = ["+1", "+44", "+33", "+52", "+34", "+91"] as const;
export const SHOP_ADDRESS_MAX = 100;

/** An empty file input posts a zero-byte File with no name, which means "no file". */
const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 && !v.name ? undefined : v);
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const requiredImage = (missing: string) =>
  z.preprocess(
    noEmptyFile,
    z
      .file(missing)
      .max(VENDOR_FILE_MAX_BYTES, "File must be 1 MB or smaller")
      .mime([...VENDOR_IMAGE_TYPES], "Use a JPG, PNG or WebP image"),
  );

/** Same password rules as the public vendor sign-up (lib/validations/auth.ts). */
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const vendorCreateSchema = z
  .object({
    firstName: z.string("Enter a first name").trim().min(1, "Enter a first name").max(50, "Use 50 characters or fewer"),
    lastName: z.string("Enter a last name").trim().min(1, "Enter a last name").max(50, "Use 50 characters or fewer"),
    countryCode: z.enum(COUNTRY_CODES, "Choose a country code"),
    phone: z
      .string("Enter a phone number")
      .trim()
      .min(1, "Enter a phone number")
      .regex(/^[0-9\s\-().]+$/, "Use digits only")
      .refine((v) => v.replace(/\D/g, "").length >= 7, "Phone number looks too short")
      .refine((v) => v.replace(/\D/g, "").length <= 15, "Phone number looks too long"),
    vendorImage: requiredImage("Upload a vendor image"),
    email: z.string("Enter an email address").trim().toLowerCase().min(1, "Enter an email address").pipe(z.email("Enter a valid email, like name@store.com")),
    password,
    confirmPassword: z.string("Confirm the password").min(1, "Confirm the password"),
    shopName: z.string("Enter a shop name").trim().min(2, "Enter a shop name").max(80, "Use 80 characters or fewer"),
    shopAddress: z.string("Enter the shop address").trim().min(5, "Enter the shop address").max(SHOP_ADDRESS_MAX, `Use ${SHOP_ADDRESS_MAX} characters or fewer`),
    logo: requiredImage("Upload a shop logo"),
    coverImage: requiredImage("Upload a cover image"),
    tinNumber: z.preprocess(emptyToUndefined, z.string().trim().max(40, "Use 40 characters or fewer").optional()),
    tinExpiresAt: z.preprocess(emptyToUndefined, z.iso.date("Enter a valid date").optional()),
    tinCertificate: z.preprocess(noEmptyFile, z.file().max(VENDOR_FILE_MAX_BYTES, "File must be 1 MB or smaller").optional()),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
export type VendorListParams = z.infer<typeof vendorListSchema>;
export type VendorStatusAction = z.infer<typeof vendorStatusActionSchema>["action"];
