import { z } from "zod";
import { COUNTRY_CODES, VENDOR_IMAGE_TYPES } from "./admin-vendor";

/** Profile photo (camera button on the avatar): JPG / PNG / WebP up to 2 MB, re-checked by its bytes on the server. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = VENDOR_IMAGE_TYPES;
export const avatarSchema = z
  .file("Choose an image")
  .min(1, "The image file is empty")
  .max(AVATAR_MAX_BYTES, "Photo must be 2 MB or smaller")
  .mime([...AVATAR_TYPES], "Use a JPG, PNG or WebP image");

/** Change Password card: the same rules as the vendor (old, new ≠ old, confirmation, 8+ chars with a letter and a number). */
export { PASSWORD_MIN, vendorPasswordSchema as changePasswordSchema } from "./vendor-profile";

/** Profile Info form (user.dashboard design): name, phone and email. The password has its own card. */
export const profileSchema = z.object({
    firstName: z.string().trim().min(1, "Enter your first name").max(50),
    lastName: z.string().trim().max(50),
    countryCode: z.enum(COUNTRY_CODES, "Choose a country code"),
    /** The national number; stored as "<countryCode> <phone>" (same format as the vendor profile). */
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[0-9\s\-().]+$/.test(v), "Use digits only")
      .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "Phone number looks too short")
      .refine((v) => v.replace(/\D/g, "").length <= 15, "Phone number looks too long"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
