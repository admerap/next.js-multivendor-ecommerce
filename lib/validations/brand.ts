import { z } from "zod";

export const BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const BRAND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * An image picked in the browser or received in FormData. An empty file input posts a
 * zero-byte File with no name, which we treat as "no image".
 */
const imageFile = z
  .file("Choose an image")
  .max(BRAND_IMAGE_MAX_BYTES, "Image must be 2 MB or smaller")
  .mime([...BRAND_IMAGE_TYPES], "Use a JPG, PNG or WebP image");

const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 && !v.name ? undefined : v);

const brandFields = {
  name: z.string().trim().min(2, "Use at least 2 characters").max(60, "Use 60 characters or fewer"),
  status: z.enum(["ACTIVE", "INACTIVE"], "Choose a status"),
};

/** Create: image required. Shared by the modal (client) and createBrand (server). */
export const brandCreateSchema = z.object({
  ...brandFields,
  image: z.preprocess(noEmptyFile, imageFile),
});

/** Edit: image optional — omitted means "keep the current image". */
export const brandUpdateSchema = z.object({
  id: z.string().min(1),
  ...brandFields,
  image: z.preprocess(noEmptyFile, imageFile.optional()),
});

export const brandIdSchema = z.object({ id: z.string().min(1) });
export const brandStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["ACTIVE", "INACTIVE"]) });

export const brandListSchema = z.object({
  q: z.string().trim().max(60).catch(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).catch("ALL"),
  /** Filter to one brand (the "All brands" dropdown). */
  brand: z.string().trim().max(40).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});

export type BrandCreateInput = z.infer<typeof brandCreateSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
export type BrandListParams = z.infer<typeof brandListSchema>;
export type BrandStatus = z.infer<typeof brandFields.status>;
