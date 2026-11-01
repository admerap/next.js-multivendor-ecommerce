import { z } from "zod";
import { SHIPPING_METHODS } from "@/lib/checkout";
import { REGION } from "@/lib/regions";

/**
 * Checkout addresses (Checkout Page design + State / Province, needed for US and Canadian mail).
 * Shared by the form (instant feedback) and the server.
 */

export const COUNTRIES = ["United States", "Canada", "United Kingdom"] as const;
export const ADDRESS_TYPES = ["HOME", "OFFICE", "OTHER"] as const;
export const ADDRESS_TYPE_LABEL: Record<(typeof ADDRESS_TYPES)[number], string> = { HOME: "Home", OFFICE: "Office", OTHER: "Other" };

const addressBase = z.object({
  name: z.string("Enter the contact person's name.").trim().min(2, "Enter the contact person's name.").max(120, "Keep the name under 120 characters."),
  phone: z
    .string("Enter a phone number.")
    .trim()
    .regex(/^\+?[0-9][0-9 ().-]{5,18}[0-9]$/, "Enter a valid phone number, like +1 555 123 4567."),
  email: z.string("Enter an email address.").trim().toLowerCase().max(191).pipe(z.email("Enter a valid email address.")),
  type: z.enum(ADDRESS_TYPES).catch("HOME"),
  country: z.enum(COUNTRIES, "Choose a country."),
  /** US state / Canadian province code ("CT", "ON"), or a free-text UK county — rules per country below */
  state: z.string().trim().max(60, "Keep it under 60 characters.").default(""),
  city: z.string("Enter the city.").trim().min(2, "Enter the city.").max(120, "Keep the city under 120 characters."),
  zip: z.string("Enter the zip / postal code.").trim().max(10, "Enter a valid zip / postal code."),
  address: z.string("Enter the street address.").trim().min(5, "Enter the street address.").max(500, "Keep the address under 500 characters."),
  /** Address line 2 — apartment, suite, unit, floor… (optional) */
  address2: z.string().trim().max(100, "Keep it under 100 characters.").default(""),
});

/** Postal-code format per country (the address carriers will read). */
const ZIP: Record<(typeof COUNTRIES)[number], { re: RegExp; message: string; normalize: (z: string) => string }> = {
  "United States": { re: /^\d{5}(-\d{4})?$/, message: "Enter a 5-digit ZIP code, like 06901 (or 06901-1234).", normalize: (z) => z },
  Canada: { re: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, message: "Enter a postal code like M5V 2T6.", normalize: (z) => z.replace(/^(...) ?(...)$/, "$1 $2") },
  "United Kingdom": { re: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, message: "Enter a postcode like SW1A 1AA.", normalize: (z) => z.replace(/^(.+?) ?(\d[A-Z]{2})$/, "$1 $2") },
};

export const addressSchema = addressBase
  .superRefine((a, ctx) => {
    const region = REGION[a.country];
    if (region.options) {
      if (!a.state) ctx.addIssue({ code: "custom", path: ["state"], message: `Choose a ${region.label.toLowerCase()}.` });
      else if (!region.options.some(([code]) => code === a.state)) ctx.addIssue({ code: "custom", path: ["state"], message: `Choose a ${region.label.toLowerCase()} from the list.` });
    }
    const zip = ZIP[a.country];
    if (!a.zip) ctx.addIssue({ code: "custom", path: ["zip"], message: "Enter the zip / postal code." });
    else if (!zip.re.test(a.zip.toUpperCase())) ctx.addIssue({ code: "custom", path: ["zip"], message: zip.message });
  })
  .transform((a) => ({ ...a, zip: ZIP[a.country].normalize(a.zip.toUpperCase()) }));
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

/** Shipping & Billing step: billing is either "same as shipping" or its own full address. */
export const checkoutAddressesSchema = z
  .object({
    shipping: addressSchema,
    billingSame: z.boolean(),
    billing: addressSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.billingSame && !v.billing) ctx.addIssue({ code: "custom", path: ["billing"], message: "Enter the billing address, or tick “Same as shipping address”." });
  });
export type CheckoutAddresses = z.output<typeof checkoutAddressesSchema>;

/** An empty form row (prefilled with what we know about the signed-in customer). */
export const emptyAddress = (who?: { name?: string | null; email?: string | null; phone?: string | null }): AddressInput => ({
  name: who?.name ?? "",
  phone: who?.phone ?? "",
  email: who?.email ?? "",
  type: "HOME",
  country: "United States",
  state: "",
  city: "",
  zip: "",
  address: "",
  address2: "",
});

// ── Cart + order inputs (what the browser may send) ──

const cartId = z.string().trim().min(1).max(64);
/** The browser cart: line key, product / variation ids and quantities — never prices. */
export const cartLinesSchema = z
  .array(z.object({ id: z.string().trim().min(1).max(140), productId: cartId, variationId: cartId.nullish(), qty: z.number().int().min(1).max(999) }))
  .max(100);
export const couponCodeSchema = z.string().trim().toUpperCase().min(1).max(32);
/** vendorId → applied coupon code (one per store) */
export const cartCouponsSchema = z.record(cartId, couponCodeSchema).refine((r) => Object.keys(r).length <= 50).default({});

export const ORDER_NOTE_MAX = 500;
/** Delivery speed for the whole order (Standard unless the shopper picks Express). */
export const shippingMethodSchema = z.enum(SHIPPING_METHODS, "Choose a delivery method.").default("STANDARD");

/** Place Order (Payment step). Terms must be accepted; v1 only takes Cash on Delivery. */
export const placeOrderSchema = z.object({
  lines: cartLinesSchema.min(1, "Your cart is empty."),
  coupons: cartCouponsSchema,
  addresses: checkoutAddressesSchema,
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX)
    .nullish()
    .transform((v) => v || null),
  shippingMethod: shippingMethodSchema,
  paymentMethod: z.literal("COD", "Choose a payment method."),
  acceptTerms: z.literal(true, "Accept the terms to place your order."),
  /** grand total (cents) shown when the button was pressed — the server refuses if it changed */
  expectedTotal: z.number().int().min(0),
});
