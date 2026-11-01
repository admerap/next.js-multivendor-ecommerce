import { z } from "zod";

/** Storefront list pages read their filters from the URL. Anything unknown or malformed falls back to the default. */

const slug = z
  .string()
  .trim()
  .max(220)
  .regex(/^[a-z0-9-]*$/)
  .catch("");
const q = z.string().trim().max(100).catch("");
const page = z.coerce.number().int().min(1).max(10_000).catch(1);
const type = z.enum(["", "physical", "digital"]).catch("");

/** All Vendors (/vendors). Sort: Default · Top rated · Most products · Newest stores. */
export const vendorListSchema = z.object({
  q,
  sort: z.enum(["default", "top-rated", "most-products", "newest"]).catch("default"),
  /** Stores that sell this kind of product. */
  type,
  /** Category slug — stores with visible products in it. */
  category: slug,
  /** Brand slug — stores with visible products of it. */
  brand: slug,
  page,
});
export type VendorListParams = z.infer<typeof vendorListSchema>;

/** Whole dollars in the URL (?min=20) → cents; empty / invalid → no bound. */
const dollars = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.coerce
    .number()
    .min(0)
    .max(1_000_000)
    .transform((d) => Math.round(d * 100))
    .optional()
    .catch(undefined),
);

/** A product listing — a store page (/vendors/[slug]) or a category page (/category/[...slug]). */
export const productListSchema = z.object({
  q,
  sort: z.enum(["default", "price-asc", "price-desc", "top-rated", "newest"]).catch("default"),
  /** "Filter By": In stock · On sale · New arrivals · Free shipping. */
  show: z.enum(["", "in-stock", "on-sale", "new", "free-shipping"]).catch(""),
  type,
  /** Final price bounds, cents. */
  min: dollars,
  max: dollars,
  /** Category slug (store page only — a category page scopes by its path). */
  category: slug,
  brand: slug,
  page,
});
export type ProductListParams = z.infer<typeof productListSchema>;

/** Params as they appear in the URL (prices back to whole dollars) — what filter links and the pager build on. */
export const productListUrlParams = (p: ProductListParams) => ({ ...p, min: p.min !== undefined ? p.min / 100 : undefined, max: p.max !== undefined ? p.max / 100 : undefined });
