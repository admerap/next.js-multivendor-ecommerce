import { z } from "zod";
import { htmlToText } from "@/lib/rich-text";

/** Vendor › Product Manage. Shared by the pages, client components and server actions. */

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const PRODUCT_TYPES = ["PHYSICAL", "DIGITAL"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ProductTypeValue = (typeof PRODUCT_TYPES)[number];

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Denied" }; // stored as REJECTED, shown as "Denied" everywhere
export const PRODUCT_TYPE_LABELS: Record<ProductTypeValue, string> = { PHYSICAL: "Physical", DIGITAL: "Digital" };

/** Below this many units a product is flagged "Low" in the list. */
export const LOW_STOCK = 10;

const id = z.string().trim().min(1).max(40);

/** URL search params of /vendor/products. Anything unknown falls back to the default. */
export const productListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["ALL", ...APPROVAL_STATUSES]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});
export type ProductListParams = z.infer<typeof productListSchema>;

export const productIdSchema = z.object({ id });

export const productActiveSchema = z.object({ id, isActive: z.boolean() });

// ── Add / Edit product form (vendoraddproduct design) ──────────────────────────
// The form sends its fields as one JSON string ("data") plus the image files. Money arrives as
// decimal strings ("189.00") and is converted to integer cents here — never through Float math.

export const PRODUCT_UNITS = ["PC", "KG", "G", "BOX", "PAIR"] as const;
export type ProductUnitValue = (typeof PRODUCT_UNITS)[number];
export const UNIT_LABELS: Record<ProductUnitValue, string> = { PC: "pc", KG: "kg", G: "g", BOX: "box", PAIR: "pair" };

export const DISCOUNT_TYPES = ["FLAT", "PERCENT"] as const;
export type DiscountTypeValue = (typeof DISCOUNT_TYPES)[number];

/** Variation options. Color is its own field in the design; the rest come from the Attributes menu. */
export const VARIANT_ATTRIBUTES = ["Color", "Size", "Storage", "Material"] as const;
export type VariantAttribute = (typeof VARIANT_ATTRIBUTES)[number];

export const PRODUCT_LIMITS = {
  name: 200,
  /** Plain text shown near the product name (fits Product.shortDescription VARCHAR(500)). */
  shortDescription: 500,
  description: 10_000,
  /** Raw HTML budget for the description (markup included); fits the TEXT column. */
  descriptionHtml: 40_000,
  sku: 64,
  tags: 10,
  tag: 30,
  gallery: 6,
  attributes: 3,
  values: 12,
  value: 30,
  variations: 100,
  metaTitle: 120,
  metaDescription: 160,
  /** Budget for all images in one save (next.config serverActions.bodySizeLimit is 12 MB). */
  uploadBytes: 10 * 1024 * 1024,
} as const;
export const PRODUCT_IMAGE_MAX_BYTES = 1024 * 1024;
export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const MAX_CENTS = 99_999_999; // $999,999.99

/** "189" | "189.5" | "189.50" → 18950. Pure string math, so no 0.1 + 0.2 surprises. */
export function toCents(value: string): number {
  const [whole, frac = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
/** 18950 → "189.50" (form inputs). */
export const centsToInput = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const moneyString = (label: string) =>
  z
    .string(`Enter ${label}`)
    .trim()
    .min(1, `Enter ${label}`)
    .regex(/^\d{1,6}(\.\d{1,2})?$/, `Enter ${label} like 189.00`)
    .transform(toCents)
    .refine((c) => c <= MAX_CENTS, "Amount is too large");

const intString = (label: string, min: number, max: number) =>
  z
    .string(`Enter ${label}`)
    .trim()
    .min(1, `Enter ${label}`)
    .regex(/^\d{1,7}$/, `${cap(label)} must be a whole number`)
    .transform(Number)
    .refine((n) => n >= min && n <= max, `${cap(label)} must be between ${min} and ${max.toLocaleString("en-US")}`);

/** "" → null for optional selects. */
const optionalId = z
  .string()
  .trim()
  .max(40)
  .transform((v) => v || null);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => v || null);

/** YouTube *embed* links only (design: "Use the embed link, not the watch link"). */
export const YOUTUBE_EMBED = /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/[\w-]{6,20}([?&][\w=&%-]*)?$/;

const variantValue = z.string().trim().min(1, "Enter a value").max(PRODUCT_LIMITS.value, `Option values are at most ${PRODUCT_LIMITS.value} characters`);

export const variantOptionSchema = z.object({
  name: z.enum(VARIANT_ATTRIBUTES),
  values: z
    .array(variantValue)
    .min(1, "Add at least one value")
    .max(PRODUCT_LIMITS.values, `At most ${PRODUCT_LIMITS.values} values per option`)
    .refine((v) => new Set(v.map((x) => x.toLowerCase())).size === v.length, "Values must be unique"),
});
export type VariantOption = z.infer<typeof variantOptionSchema>;

export const variationInputSchema = z.object({
  /** Combination name, e.g. "Red / M" — the stable key of the row. */
  name: z.string().trim().min(1).max(160),
  attributes: z.record(z.string(), variantValue),
  sku: optionalText(PRODUCT_LIMITS.sku, "Variation SKU"),
  price: moneyString("a price").refine((c) => c > 0, "Price must be more than $0"),
  stock: intString("stock", 0, 1_000_000),
  /** Edit form: the saved image to keep (a new file under variationImage:<name> replaces it). */
  image: z.string().max(200).nullish(),
});

export const productFormSchema = z
  .object({
    name: z
      .string("Enter the product name")
      .trim()
      .min(3, "Product name must be at least 3 characters")
      .max(PRODUCT_LIMITS.name, `Product name must be ${PRODUCT_LIMITS.name} characters or fewer`),
    // Rich-text HTML from the editor: the length rules count the visible text, not the markup.
    // The server sanitizes it (lib/rich-text.server.ts) before saving.
    description: z
      .string("Enter a description")
      .trim()
      .max(PRODUCT_LIMITS.descriptionHtml, "Description is too long")
      .refine((html) => htmlToText(html).length >= 20, "Description must be at least 20 characters")
      .refine((html) => htmlToText(html).length <= PRODUCT_LIMITS.description, `Description must be ${PRODUCT_LIMITS.description.toLocaleString("en-US")} characters or fewer`),
    productType: z.enum(PRODUCT_TYPES, "Choose a product type"),
    categoryId: z.string("Choose a category").trim().min(1, "Choose a category").max(40),
    subCategoryId: optionalId,
    subSubCategoryId: optionalId,
    brandId: optionalId,
    sku: z
      .string("Enter a product SKU")
      .trim()
      .min(3, "SKU must be at least 3 characters")
      .max(PRODUCT_LIMITS.sku, `SKU must be ${PRODUCT_LIMITS.sku} characters or fewer`)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "SKU can use letters, numbers, dashes, dots or underscores"),
    unit: z.enum(PRODUCT_UNITS, "Choose a unit"),
    tags: z
      .array(z.string().trim().min(1).max(PRODUCT_LIMITS.tag, `Tags are at most ${PRODUCT_LIMITS.tag} characters`))
      .max(PRODUCT_LIMITS.tags, `At most ${PRODUCT_LIMITS.tags} tags`)
      .transform((t) => [...new Map(t.map((x) => [x.toLowerCase(), x])).values()]),
    price: moneyString("the unit price").refine((c) => c > 0, "Unit price must be more than $0"),
    minOrderQty: intString("minimum order qty", 1, 10_000),
    stock: intString("current stock qty", 0, 1_000_000),
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: z
      .string()
      .trim()
      .regex(/^(\d{1,6}(\.\d{1,2})?)?$/, "Enter a discount like 10 or 10.50"),
    shippingCost: moneyString("the shipping cost"),
    shippingPerUnit: z.boolean(),
    hasVariations: z.boolean(),
    variantOptions: z.array(variantOptionSchema).max(PRODUCT_LIMITS.attributes, `At most ${PRODUCT_LIMITS.attributes} options`),
    variations: z.array(variationInputSchema).max(PRODUCT_LIMITS.variations, `At most ${PRODUCT_LIMITS.variations} variations`),
    videoUrl: z
      .string()
      .trim()
      .max(255)
      .refine((v) => v === "" || YOUTUBE_EMBED.test(v), "Use a YouTube embed link, e.g. https://www.youtube.com/embed/5R06LRdUCSE")
      .transform((v) => v || null),
    // Optional: missing or blank → null.
    shortDescription: z
      .string()
      .trim()
      .max(PRODUCT_LIMITS.shortDescription, `Short description must be ${PRODUCT_LIMITS.shortDescription} characters or fewer`)
      .optional()
      .transform((v) => v || null),
    metaTitle: optionalText(PRODUCT_LIMITS.metaTitle, "Meta title"),
    metaDescription: optionalText(PRODUCT_LIMITS.metaDescription, "Meta description"),
  })
  .superRefine((d, ctx) => {
    if (d.subSubCategoryId && !d.subCategoryId) ctx.addIssue({ code: "custom", path: ["subSubCategoryId"], message: "Choose a sub category first" });

    // Discount: "" = none. Flat is in dollars and must leave a price; percent is a whole 0–99.
    const raw = d.discountValue;
    if (raw !== "") {
      if (d.discountType === "PERCENT") {
        if (!/^\d{1,2}$/.test(raw)) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percent discount must be a whole number from 0 to 99" });
      } else if (toCents(raw) >= d.price) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Discount must be less than the unit price" });
      }
    }

    if (!d.hasVariations) return;
    if (d.variantOptions.length === 0) {
      ctx.addIssue({ code: "custom", path: ["variantOptions"], message: "Add at least one option, e.g. colors" });
      return;
    }
    if (new Set(d.variantOptions.map((o) => o.name)).size !== d.variantOptions.length) {
      ctx.addIssue({ code: "custom", path: ["variantOptions"], message: "Each option can be added once" });
    }
    if (d.variations.length === 0) {
      ctx.addIssue({ code: "custom", path: ["variations"], message: "Keep at least one variation, or turn variations off" });
      return;
    }
    // Every row must be a real combination of the options (no forged attributes).
    const allowed = new Map(d.variantOptions.map((o) => [o.name as string, new Set(o.values)]));
    const names = new Set<string>();
    const skus = new Set<string>();
    d.variations.forEach((v, i) => {
      const keys = Object.keys(v.attributes);
      const valid = keys.length === allowed.size && keys.every((k) => allowed.get(k)?.has(v.attributes[k]));
      if (!valid || v.name !== variationName(d.variantOptions, v.attributes)) {
        ctx.addIssue({ code: "custom", path: ["variations", i, "name"], message: "This variation doesn't match the options" });
      }
      if (names.has(v.name)) ctx.addIssue({ code: "custom", path: ["variations", i, "name"], message: "Duplicate variation" });
      names.add(v.name);
      if (v.sku) {
        if (skus.has(v.sku.toLowerCase())) ctx.addIssue({ code: "custom", path: ["variations", i, "sku"], message: "Variation SKUs must be unique" });
        skus.add(v.sku.toLowerCase());
      }
    });
  })
  .transform(({ discountValue, ...d }) => ({
    ...d,
    // Digital products have no shipping and no stock count of their own (vendoreditproduct design).
    ...(d.productType === "DIGITAL" && { shippingCost: 0, shippingPerUnit: false, stock: 0 }),
    // Stored as cents (FLAT) or whole percent (PERCENT); "" = no discount.
    discountValue: discountValue === "" ? 0 : d.discountType === "PERCENT" ? Number(discountValue) : toCents(discountValue),
  }));

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

/** "Red / M" from {Color:"Red",Size:"M"}, in option order. */
export function variationName(options: { name: string }[], attributes: Record<string, string>) {
  return options.map((o) => attributes[o.name]).join(" / ");
}

/** Every combination of the option values, in option order: Red/S, Red/M, …, Blue/S… */
export function buildCombinations(options: { name: string; values: string[] }[]): { name: string; attributes: Record<string, string> }[] {
  const filled = options.filter((o) => o.values.length > 0);
  if (filled.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const o of filled) combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
  return combos.map((attributes) => ({ name: variationName(filled, attributes), attributes }));
}
