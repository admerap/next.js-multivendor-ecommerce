import { z } from "zod";
import { BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from "./brand";

/*
 * Category tree validation, shared by the modals (client) and the server actions.
 * Checks that need the database (parent exists, sub-category belongs to the category)
 * live in ./category.server.ts — the client can't be trusted with them.
 */

export const CATEGORY_IMAGE_MAX_BYTES = BRAND_IMAGE_MAX_BYTES;
export const CATEGORY_IMAGE_TYPES = BRAND_IMAGE_TYPES;

const imageFile = z
  .file("Choose an image")
  .max(CATEGORY_IMAGE_MAX_BYTES, "Image must be 2 MB or smaller")
  .mime([...CATEGORY_IMAGE_TYPES], "Use a JPG, PNG or WebP image");

/** An empty file input posts a zero-byte File with no name, which means "no image". */
const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 && !v.name ? undefined : v);

const id = (message: string) => z.string(message).trim().min(1, message);
const name = z.string("Enter a name").trim().min(2, "Use at least 2 characters").max(60, "Use 60 characters or fewer");
const status = z.enum(["ACTIVE", "INACTIVE"], "Choose a status");

// ── Category ─────────────────────────────────────────────────────────────────

const categoryFields = { name, status, image: z.preprocess(noEmptyFile, imageFile.optional()) };

/** Create: image optional. */
export const categoryCreateSchema = z.object(categoryFields);
/** Edit: image optional — omitted means "keep the current image". */
export const categoryUpdateSchema = z.object({ id: id("Invalid category"), ...categoryFields });

// ── Sub-category ─────────────────────────────────────────────────────────────

const subCategoryFields = { name, status, categoryId: id("Choose a category") };

export const subCategoryCreateSchema = z.object(subCategoryFields);
export const subCategoryUpdateSchema = z.object({ id: id("Invalid sub-category"), ...subCategoryFields });

// ── Sub-sub-category ─────────────────────────────────────────────────────────

const subSubCategoryFields = {
  name,
  status,
  categoryId: id("Choose a category"),
  subCategoryId: id("Choose a sub-category"),
};

export const subSubCategoryCreateSchema = z.object(subSubCategoryFields);
export const subSubCategoryUpdateSchema = z.object({ id: id("Invalid sub-sub-category"), ...subSubCategoryFields });

// ── Shared ───────────────────────────────────────────────────────────────────

export const categoryIdSchema = z.object({ id: id("Invalid item") });
export const categoryStatusSchema = z.object({ id: id("Invalid item"), status });

/** List params from the URL. Bad values fall back to defaults instead of failing the page. */
const listBase = {
  q: z.string().trim().max(60).catch(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).catch("ALL"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
};
const filterId = z.string().trim().max(40).catch("");

export const categoryListSchema = z.object({ ...listBase, category: filterId });
export const subCategoryListSchema = z.object({ ...listBase, category: filterId });
export const subSubCategoryListSchema = z.object({ ...listBase, category: filterId, sub: filterId });

// ── Types ────────────────────────────────────────────────────────────────────

export type CategoryStatus = z.infer<typeof status>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type SubCategoryCreateInput = z.infer<typeof subCategoryCreateSchema>;
export type SubCategoryUpdateInput = z.infer<typeof subCategoryUpdateSchema>;
export type SubSubCategoryCreateInput = z.infer<typeof subSubCategoryCreateSchema>;
export type SubSubCategoryUpdateInput = z.infer<typeof subSubCategoryUpdateSchema>;
export type CategoryListParams = z.infer<typeof categoryListSchema>;
export type SubCategoryListParams = z.infer<typeof subCategoryListSchema>;
export type SubSubCategoryListParams = z.infer<typeof subSubCategoryListSchema>;
