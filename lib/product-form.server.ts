import "server-only";

import { prisma } from "@/lib/db";
import { htmlToText } from "@/lib/rich-text";
import { sanitizeDescription } from "@/lib/rich-text.server";
import { nextFreeSlug, slugify } from "@/lib/slug";
import { deleteProductImage, saveProductImage, UploadError } from "@/lib/uploads";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_LIMITS, productFormSchema, type ProductFormData } from "@/lib/validations/product";

export type FieldErrors = Record<string, string>;

export type ProductFiles = {
  thumbnail: File | null;
  gallery: File[];
  /** keyed by variation name ("Red / M") */
  variationImages: Map<string, File>;
};

const isFile = (v: FormDataEntryValue | null): v is File => v instanceof File && v.size > 0;

/** "variations.3.price" style keys for the form's inline errors; first message per key wins. */
function collect(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues) out[i.path.map(String).join(".") || "form"] ??= i.message;
  return out;
}

/**
 * Parses the product form: one JSON "data" field (Zod-validated) plus image files (size/count
 * checked here; the bytes are sniffed when saved). Never trusts anything the client says about ids.
 */
export function parseProductForm(formData: FormData, keptGallery = 0): { ok: true; data: ProductFormData; files: ProductFiles } | { ok: false; fieldErrors: FieldErrors } {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { ok: false, fieldErrors: { form: "The form couldn't be read. Please reload and try again." } };
  }
  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: collect(parsed.error.issues) };
  // Keep only the editor's HTML subset, then re-check the visible length after cleaning.
  const data = { ...parsed.data, description: sanitizeDescription(parsed.data.description) };
  if (htmlToText(data.description).length < 20) return { ok: false, fieldErrors: { description: "Description must be at least 20 characters" } };

  const thumbnail = formData.get("thumbnail");
  const gallery = formData.getAll("gallery").filter(isFile);
  const variationImages = new Map<string, File>();
  if (data.hasVariations) {
    for (const v of data.variations) {
      const f = formData.get(`variationImage:${v.name}`);
      if (isFile(f)) variationImages.set(v.name, f);
    }
  }
  const files: ProductFiles = { thumbnail: isFile(thumbnail) ? thumbnail : null, gallery, variationImages };

  const errors: FieldErrors = {};
  const all = [files.thumbnail, ...gallery, ...variationImages.values()].filter((f): f is File => !!f);
  const tooBig = `Images must be ${PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller`;
  if (files.thumbnail && files.thumbnail.size > PRODUCT_IMAGE_MAX_BYTES) errors.thumbnail = tooBig;
  if (gallery.length + keptGallery > PRODUCT_LIMITS.gallery) errors.gallery = `At most ${PRODUCT_LIMITS.gallery} additional images`;
  else if (gallery.some((f) => f.size > PRODUCT_IMAGE_MAX_BYTES)) errors.gallery = tooBig;
  data.variations.forEach((v, i) => {
    if ((variationImages.get(v.name)?.size ?? 0) > PRODUCT_IMAGE_MAX_BYTES) errors[`variations.${i}.image`] = tooBig;
  });
  if (all.reduce((n, f) => n + f.size, 0) > PRODUCT_LIMITS.uploadBytes) errors.form = "These images are over 10 MB together. Upload fewer or smaller images.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  return { ok: true, data, files };
}

/** The category → sub → sub-sub chain must be real, linked and active; the brand active. */
export async function checkCatalogLinks(d: Pick<ProductFormData, "categoryId" | "subCategoryId" | "subSubCategoryId" | "brandId">): Promise<FieldErrors> {
  const [category, sub, subSub, brand] = await Promise.all([
    prisma.category.findFirst({ where: { id: d.categoryId, status: "ACTIVE" }, select: { id: true } }),
    d.subCategoryId ? prisma.subCategory.findFirst({ where: { id: d.subCategoryId, status: "ACTIVE" }, select: { categoryId: true } }) : null,
    d.subSubCategoryId ? prisma.subSubCategory.findFirst({ where: { id: d.subSubCategoryId, status: "ACTIVE" }, select: { subCategoryId: true } }) : null,
    d.brandId ? prisma.brand.findFirst({ where: { id: d.brandId, status: "ACTIVE" }, select: { id: true } }) : null,
  ]);
  const errors: FieldErrors = {};
  if (!category) errors.categoryId = "This category isn't available. Choose another one.";
  if (d.subCategoryId && sub?.categoryId !== d.categoryId) errors.subCategoryId = "This sub category doesn't belong to the chosen category.";
  if (d.subSubCategoryId && subSub?.subCategoryId !== d.subCategoryId) errors.subSubCategoryId = "This sub sub category doesn't belong to the chosen sub category.";
  if (d.brandId && !brand) errors.brandId = "This brand isn't available. Choose another one.";
  return errors;
}

/** First free product slug for `name` (globally unique). */
export async function uniqueProductSlug(name: string, excludeId?: string) {
  const base = slugify(name, "product");
  const taken = await prisma.product.findMany({
    where: { slug: { startsWith: base }, ...(excludeId && { NOT: { id: excludeId } }) },
    select: { slug: true },
  });
  return nextFreeSlug(base, taken.map((t) => t.slug));
}

/**
 * Saves files one by one; on any failure removes the ones already written and rethrows, so a
 * rejected save never leaves orphans in /public/uploads/products.
 */
export async function saveAll<K>(entries: [K, File][]): Promise<Map<K, string>> {
  const saved = new Map<K, string>();
  try {
    for (const [key, file] of entries) saved.set(key, await saveProductImage(file));
    return saved;
  } catch (error) {
    await Promise.all([...saved.values()].map((p) => deleteProductImage(p)));
    throw error;
  }
}

export { UploadError };
