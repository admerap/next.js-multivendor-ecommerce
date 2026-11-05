import { z } from "zod";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/lib/validations/account";
import { passwordRules } from "@/lib/validations/auth";

/** Admin › Users › Users URL: ?q (name, email, phone) · ?page · ?pageSize · ?view (active | deleted). */
export const adminUserListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(10),
  view: z.enum(["active", "deleted"]).catch("active"),
});
export type AdminUserListParams = z.infer<typeof adminUserListSchema>;

/**
 * Users keep one `name` field (stored as "First Last"): the table shows the first word as Name and the rest as
 * Last Name.
 */
export function splitName(full: string): { first: string; last: string } {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}

/** One staff account (Delete / Restore). */
export const userIdSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{1,40}$/i, "Unknown user"),
});

/** User photo: optional, JPG / PNG / WebP up to 2 MB (same as the customer avatar), re-checked by its bytes on save. */
export const STAFF_IMAGE_MAX_BYTES = AVATAR_MAX_BYTES;
export const STAFF_IMAGE_TYPES = AVATAR_TYPES;
export const staffImageSchema = z
  .file("Choose an image")
  .min(1, "The image file is empty")
  .max(STAFF_IMAGE_MAX_BYTES, "Photo must be 2 MB or smaller")
  .mime([...STAFF_IMAGE_TYPES], "Use a JPG, PNG or WebP image");

/** New / Edit User modal. Phone is optional; the rest are required. Status Inactive = the account can't sign in. */
export const STAFF_STATUSES = ["active", "inactive"] as const;
const staffUserFields = z.object({
  /** an AdminRole id; whether it may be given is checked on the server */
  role: z
    .string("Select a role")
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/i, "Select a role"),
  firstName: z.string().trim().min(1, "Enter the name").max(50, "Use 50 characters or fewer"),
  lastName: z.string().trim().min(1, "Enter the last name").max(50, "Use 50 characters or fewer"),
  phone: z
    .string()
    .trim()
    .max(32)
    .refine((v) => v === "" || /^\+?[0-9\s\-()]{7,24}$/.test(v), "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  status: z.enum(STAFF_STATUSES, "Select a status"),
});
export const createStaffUserSchema = staffUserFields.extend({ password: passwordRules });
/** Edit: the password stays as it is when left empty. */
export const updateStaffUserSchema = staffUserFields.extend({
  id: userIdSchema.shape.id,
  password: z.union([z.literal(""), passwordRules]),
});
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;
export type UpdateStaffUserInput = z.infer<typeof updateStaffUserSchema>;

/** Admin › Profile: your own name, phone and email (role and status are set by whoever manages users). */
export const staffProfileSchema = staffUserFields.pick({ firstName: true, lastName: true, phone: true, email: true });
export type StaffProfileInput = z.infer<typeof staffProfileSchema>;
