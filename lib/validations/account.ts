import { z } from "zod";
import { passwordRules } from "./auth";

/** Profile Info form (user.dashboard design). Password fields are optional: blank = keep current. */
export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name").max(50),
    lastName: z.string().trim().max(50),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\+?[0-9\s\-()]{7,24}$/.test(v), "Enter a valid phone number"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    currentPassword: z.string().max(72),
    newPassword: z.union([z.literal(""), passwordRules]),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((d) => d.newPassword === "" || d.currentPassword.length > 0, {
    path: ["currentPassword"],
    message: "Enter your current password to set a new one",
  });

export type ProfileInput = z.infer<typeof profileSchema>;
