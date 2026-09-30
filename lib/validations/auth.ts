import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const passwordRules = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(72),
});

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email,
  password: passwordRules,
});

const passwordsMatch = {
  check: (d: { password: string; confirmPassword: string }) => d.password === d.confirmPassword,
  params: { path: ["confirmPassword"], message: "Passwords don't match" },
};

const vendorFields = z.object({
  email,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,24}$/, "Enter a valid phone number"),
  password: passwordRules,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string().trim().min(1, "Enter your first name").max(50),
  lastName: z.string().trim().min(1, "Enter your last name").max(50),
  storeName: z.string().trim().min(2, "Enter your store name").max(80),
  storeAddress: z.string().trim().min(5, "Enter your store address").max(500),
  acceptTerms: z.literal(true, "Please accept the Seller Terms to continue"),
});

/** Step 1 of the vendor form: account details. */
export const vendorAccountStepSchema = vendorFields
  .pick({ email: true, phone: true, password: true, confirmPassword: true })
  .refine(passwordsMatch.check, passwordsMatch.params);

/** Step 2 of the vendor form: store details. */
export const vendorStoreStepSchema = vendorFields.pick({
  firstName: true,
  lastName: true,
  storeName: true,
  storeAddress: true,
  acceptTerms: true,
});

/** Full payload, validated again on the server. */
export const vendorRegisterSchema = vendorFields.refine(passwordsMatch.check, passwordsMatch.params);

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type VendorRegisterInput = z.infer<typeof vendorRegisterSchema>;
