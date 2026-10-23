"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkCatalogLinks, parseProductForm, saveAll, uniqueProductSlug, UploadError, type FieldErrors } from "@/lib/product-form.server";
import { deleteProductImage } from "@/lib/uploads";
import { currentVendorId } from "@/lib/vendor-auth";
import {
  PRODUCT_LIMITS,
  productActiveSchema,
  productIdSchema,
  productListSchema,
  type ApprovalStatus,
  type ProductFormData,
  type ProductTypeValue,
} from "@/lib/validations/product";

export type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T; fieldErrors?: FieldErrors };
export type CatalogOption = { id: string; name: string };

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  thumbnail: string | null;
  category: string;
  productType: ProductTypeValue;
  /** cents */
  price: number;
  /** Product.stock — already the total of its variations when it has any (kept in sync on save). */
  stock: number;
  variationsCount: number;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
};

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const NOT_FOUND = "This product no longer exists.";

/**
 * This vendor's products only (vendorId from the session), filtered by search and approval
 * status, newest first, paginated on the server.
 */
export async function getVendorProducts(input: unknown): Promise<
  ActionResult<{ items: ProductRow[]; total: number; page: number; pageSize: number; pageCount: number }>
> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const { q, status, page, pageSize } = productListSchema.parse(input ?? {});

  const where: Prisma.ProductWhereInput = {
    vendorId,
    ...(status !== "ALL" && { approvalStatus: status }),
    ...(q && { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }),
  };

  try {
    const total = await prisma.product.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (current - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        productType: true,
        price: true,
        stock: true,
        approvalStatus: true,
        isActive: true,
        category: { select: { name: true } },
        _count: { select: { variations: true } },
      },
    });
    const items: ProductRow[] = rows.map(({ category, _count, ...p }) => ({
      ...p,
      category: category.name,
      variationsCount: _count.variations,
    }));
    return { success: true, data: { items, total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[vendor products] list failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load your products." };
  }
}

/** Vendor's own show/hide switch. Never touches approvalStatus (that's the admin's review). */
export async function setProductActive(input: unknown): Promise<ActionResult<{ isActive: boolean; approvalStatus: ApprovalStatus }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const parsed = productActiveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id, isActive } = parsed.data;

  try {
    // Scoped update: another vendor's id simply matches nothing.
    const { count } = await prisma.product.updateMany({ where: { id, vendorId }, data: { isActive } });
    if (count === 0) return { success: false, error: NOT_FOUND };
    const p = await prisma.product.findUniqueOrThrow({ where: { id }, select: { isActive: true, approvalStatus: true } });
    revalidatePath("/vendor/products");
    return { success: true, data: p };
  } catch (error) {
    console.error("[vendor products] toggle failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't update the product. Please try again." };
  }
}

/** Permanently deletes one of this vendor's products, its variations, gallery rows and image files. */
export async function deleteProduct(input: unknown): Promise<ActionResult> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const parsed = productIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id, vendorId },
    select: { thumbnail: true, images: { select: { url: true } }, variations: { select: { image: true } } },
  });
  if (!product) return { success: false, error: NOT_FOUND };

  try {
    // Variations and gallery rows go with it (onDelete: Cascade).
    // TODO(orders): once orders exist, deactivate instead of deleting a product that has order items.
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    console.error("[vendor products] delete failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't delete the product. Please try again." };
  }
  // Files only after the row is gone, so a failed delete never leaves a product without images.
  await Promise.all(
    [product.thumbnail, ...product.images.map((i) => i.url), ...product.variations.map((v) => v.image)].map((f) => deleteProductImage(f)),
  );
  revalidatePath("/vendor/products");
  return { success: true };
}

// ── Add product ───────────────────────────────────────────────────────────────

const optionId = productIdSchema.shape.id;

/** Active sub categories of one category — fetched when the vendor picks a category. */
export async function getSubCategoryOptions(categoryId: unknown): Promise<ActionResult<CatalogOption[]>> {
  if (!(await currentVendorId())) return { success: false, error: SESSION_EXPIRED };
  const parsed = optionId.safeParse(categoryId);
  if (!parsed.success) return { success: false, error: "Choose a category" };
  try {
    const data = await prisma.subCategory.findMany({
      where: { categoryId: parsed.data, status: "ACTIVE", category: { status: "ACTIVE" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return { success: true, data };
  } catch (error) {
    console.error("[vendor products] sub categories failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load sub categories. Please try again." };
  }
}

/** Active sub sub categories of one sub category. */
export async function getSubSubCategoryOptions(subCategoryId: unknown): Promise<ActionResult<CatalogOption[]>> {
  if (!(await currentVendorId())) return { success: false, error: SESSION_EXPIRED };
  const parsed = optionId.safeParse(subCategoryId);
  if (!parsed.success) return { success: false, error: "Choose a sub category" };
  try {
    const data = await prisma.subSubCategory.findMany({
      where: { subCategoryId: parsed.data, status: "ACTIVE", subCategory: { status: "ACTIVE" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return { success: true, data };
  } catch (error) {
    console.error("[vendor products] sub sub categories failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load sub sub categories. Please try again." };
  }
}

/** Brand picker search (server side, so the list scales): first 50 active brands matching the text. */
export async function searchBrandOptions(query: unknown): Promise<ActionResult<CatalogOption[]>> {
  if (!(await currentVendorId())) return { success: false, error: SESSION_EXPIRED };
  const q = z.string().trim().max(60).catch("").parse(query);
  try {
    const data = await prisma.brand.findMany({
      where: { status: "ACTIVE", ...(q && { name: { contains: q } }) },
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true },
    });
    return { success: true, data };
  } catch (error) {
    console.error("[vendor products] brand search failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't search brands. Please try again." };
  }
}

const FIX_FIELDS = "Please fix the highlighted fields";
const SAVE_FAILED = "We couldn't save the product. Please try again.";

/**
 * Creates a product for the signed-in vendor (vendorId from the session). Everything is validated
 * on the server; the product, its gallery and its variations are written in one transaction and
 * start as PENDING (admin review) + active. Images are saved first and removed if the write fails.
 */
export async function createProduct(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };

  const parsed = parseProductForm(formData);
  if (!parsed.ok) return { success: false, error: parsed.fieldErrors.form ?? FIX_FIELDS, fieldErrors: parsed.fieldErrors };
  const { data: d, files } = parsed;
  if (!files.thumbnail) return { success: false, error: FIX_FIELDS, fieldErrors: { thumbnail: "Upload a product thumbnail" } };

  try {
    const linkErrors = await checkCatalogLinks(d);
    if (Object.keys(linkErrors).length) return { success: false, error: FIX_FIELDS, fieldErrors: linkErrors };
    if (await prisma.product.findFirst({ where: { vendorId, sku: d.sku }, select: { id: true } })) {
      return { success: false, error: FIX_FIELDS, fieldErrors: { sku: "You already use this SKU on another product" } };
    }
  } catch (error) {
    console.error("[vendor products] create check failed", error instanceof Error ? error.message : error);
    return { success: false, error: SAVE_FAILED };
  }

  let saved: Map<string, string>;
  try {
    saved = await saveAll<string>([
      ["thumbnail", files.thumbnail],
      ...files.gallery.map((f, i): [string, File] => [`gallery:${i}`, f]),
      ...[...files.variationImages].map(([name, f]): [string, File] => [`variation:${name}`, f]),
    ]);
  } catch (error) {
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { form: error.message } };
    console.error("[vendor products] image save failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't save the images. Please try again." };
  }

  const variations = d.hasVariations ? d.variations : [];
  try {
    // One nested create = one transaction: product + gallery rows + variation rows.
    const product = await prisma.product.create({
      data: {
        vendorId,
        name: d.name,
        slug: await uniqueProductSlug(d.name),
        sku: d.sku,
        productType: d.productType,
        unit: d.unit,
        shortDescription: d.shortDescription,
        description: d.description,
        tags: d.tags.length ? d.tags : Prisma.DbNull,
        categoryId: d.categoryId,
        subCategoryId: d.subCategoryId,
        subSubCategoryId: d.subSubCategoryId,
        brandId: d.brandId,
        price: d.price,
        discountType: d.discountType,
        discountValue: d.discountValue,
        shippingCost: d.shippingCost,
        shippingPerUnit: d.shippingPerUnit,
        minOrderQty: d.minOrderQty,
        // With variations their stock is the truth; the product keeps the total for quick reads.
        stock: variations.length ? variations.reduce((n, v) => n + v.stock, 0) : d.stock,
        variantOptions: variations.length ? d.variantOptions : Prisma.DbNull,
        thumbnail: saved.get("thumbnail")!,
        videoUrl: d.videoUrl,
        metaTitle: d.metaTitle,
        metaDescription: d.metaDescription,
        approvalStatus: "PENDING",
        isActive: true,
        images: { create: files.gallery.map((_, i) => ({ url: saved.get(`gallery:${i}`)!, position: i })) },
        variations: {
          create: variations.map((v, i) => ({
            name: v.name,
            attributes: v.attributes,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            image: saved.get(`variation:${v.name}`) ?? null,
            position: i,
          })),
        },
      },
      select: { id: true },
    });
    revalidatePath("/vendor/products");
    return { success: true, data: product };
  } catch (error) {
    await Promise.all([...saved.values()].map((p) => deleteProductImage(p)));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (String(error.meta?.target ?? "").includes("sku")) {
        return { success: false, error: FIX_FIELDS, fieldErrors: { sku: "You already use this SKU on another product" } };
      }
      return { success: false, error: "Another product was saved with the same name just now. Please try again." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { success: false, error: "A category or brand you chose was just removed. Please choose again." };
    }
    console.error("[vendor products] create failed", error instanceof Error ? error.message : error);
    return { success: false, error: SAVE_FAILED };
  }
}

// ── Edit product ──────────────────────────────────────────────────────────────

const keepListSchema = z.array(z.string().max(200)).max(PRODUCT_LIMITS.gallery);

/**
 * Updates one of the signed-in vendor's products. Ownership is checked on the server (another
 * vendor's id is simply "not found"). Gallery and variations are diffed: kept rows are updated,
 * removed ones deleted, new ones created — all in one transaction. Replaced or removed image files
 * are deleted only after the write commits. An approved product whose shopper-facing details
 * change goes back to PENDING for re-review; a rejected one goes back to PENDING on any edit.
 */
export async function updateProduct(formData: FormData): Promise<ActionResult<{ id: string; approvalStatus: ApprovalStatus; reReview: boolean }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };

  const idParsed = productIdSchema.safeParse({ id: formData.get("id") });
  let keep: string[];
  try {
    keep = keepListSchema.parse(JSON.parse(String(formData.get("keepGallery") ?? "[]")));
  } catch {
    return { success: false, error: "The form couldn't be read. Please reload and try again." };
  }
  if (!idParsed.success) return { success: false, error: NOT_FOUND };
  const { id } = idParsed.data;

  const current = await prisma.product.findFirst({
    where: { id, vendorId },
    include: { images: { orderBy: { position: "asc" } }, variations: { orderBy: { position: "asc" } } },
  });
  if (!current) return { success: false, error: NOT_FOUND };

  // Only images that really belong to this product can be kept (no pointing at other files).
  const ownGallery = new Set(current.images.map((i) => i.url));
  const keptGallery = [...new Set(keep)].filter((u) => ownGallery.has(u));

  const parsed = parseProductForm(formData, keptGallery.length);
  if (!parsed.ok) return { success: false, error: parsed.fieldErrors.form ?? FIX_FIELDS, fieldErrors: parsed.fieldErrors };
  const { data: d, files } = parsed;

  try {
    const linkErrors = await checkCatalogLinks(d);
    if (Object.keys(linkErrors).length) return { success: false, error: FIX_FIELDS, fieldErrors: linkErrors };
    if (await prisma.product.findFirst({ where: { vendorId, sku: d.sku, NOT: { id } }, select: { id: true } })) {
      return { success: false, error: FIX_FIELDS, fieldErrors: { sku: "You already use this SKU on another product" } };
    }
  } catch (error) {
    console.error("[vendor products] update check failed", error instanceof Error ? error.message : error);
    return { success: false, error: SAVE_FAILED };
  }

  let saved: Map<string, string>;
  try {
    saved = await saveAll<string>([
      ...(files.thumbnail ? [["thumbnail", files.thumbnail] as [string, File]] : []),
      ...files.gallery.map((f, i): [string, File] => [`gallery:${i}`, f]),
      ...[...files.variationImages].map(([name, f]): [string, File] => [`variation:${name}`, f]),
    ]);
  } catch (error) {
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { form: error.message } };
    console.error("[vendor products] image save failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't save the images. Please try again." };
  }

  // ── Diff variations by combination name ──
  const variations = d.hasVariations ? d.variations : [];
  const oldByName = new Map(current.variations.map((v) => [v.name, v]));
  const ownVariationImages = new Set(current.variations.map((v) => v.image).filter(Boolean));
  const nextVariations = variations.map((v, i) => ({
    ...v,
    position: i,
    // A new file wins; otherwise keep the saved image only if it really was this product's.
    image: saved.get(`variation:${v.name}`) ?? (v.image && ownVariationImages.has(v.image) ? v.image : null),
  }));
  const toDelete = current.variations.filter((v) => !nextVariations.some((n) => n.name === v.name));
  const toUpdate = nextVariations.filter((v) => oldByName.has(v.name));
  const toCreate = nextVariations.filter((v) => !oldByName.has(v.name));

  const thumbnail = saved.get("thumbnail") ?? current.thumbnail;
  const galleryUrls = [...keptGallery, ...files.gallery.map((_, i) => saved.get(`gallery:${i}`)!)];
  const stock = variations.length ? variations.reduce((n, v) => n + v.stock, 0) : d.stock;

  const reReview = needsReReview(current, { ...d, thumbnail, galleryUrls, variations: nextVariations });
  const approvalStatus: ApprovalStatus = current.approvalStatus === "APPROVED" && !reReview ? "APPROVED" : current.approvalStatus === "REJECTED" || reReview ? "PENDING" : current.approvalStatus;

  try {
    await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: {
          name: d.name,
          ...(d.name !== current.name && { slug: await uniqueProductSlug(d.name, id) }),
          sku: d.sku,
          productType: d.productType,
          unit: d.unit,
          shortDescription: d.shortDescription,
          description: d.description,
          tags: d.tags.length ? d.tags : Prisma.DbNull,
          categoryId: d.categoryId,
          subCategoryId: d.subCategoryId,
          subSubCategoryId: d.subSubCategoryId,
          brandId: d.brandId,
          price: d.price,
          discountType: d.discountType,
          discountValue: d.discountValue,
          shippingCost: d.shippingCost,
          shippingPerUnit: d.shippingPerUnit,
          minOrderQty: d.minOrderQty,
          stock,
          variantOptions: variations.length ? d.variantOptions : Prisma.DbNull,
          thumbnail,
          videoUrl: d.videoUrl,
          metaTitle: d.metaTitle,
          metaDescription: d.metaDescription,
          approvalStatus,
          // Back in the admin queue (resubmitted / re-review): it queues from now.
          ...(approvalStatus === "PENDING" && current.approvalStatus !== "PENDING" && { submittedAt: new Date() }),
        },
      }),
      // Gallery: drop rows no longer kept, add the new ones, then renumber in display order.
      prisma.productImage.deleteMany({ where: { productId: id, url: { notIn: keptGallery } } }),
      ...files.gallery.map((_, i) => prisma.productImage.create({ data: { productId: id, url: saved.get(`gallery:${i}`)!, position: 0 } })),
      ...galleryUrls.map((url, position) => prisma.productImage.updateMany({ where: { productId: id, url }, data: { position } })),
      prisma.productVariation.deleteMany({ where: { productId: id, id: { in: toDelete.map((v) => v.id) } } }),
      ...toUpdate.map((v) =>
        prisma.productVariation.update({
          where: { id: oldByName.get(v.name)!.id },
          data: { attributes: v.attributes, sku: v.sku, price: v.price, stock: v.stock, image: v.image, position: v.position },
        }),
      ),
      ...toCreate.map((v) =>
        prisma.productVariation.create({
          data: { productId: id, name: v.name, attributes: v.attributes, sku: v.sku, price: v.price, stock: v.stock, image: v.image, position: v.position },
        }),
      ),
    ]);
  } catch (error) {
    await Promise.all([...saved.values()].map((p) => deleteProductImage(p)));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (String(error.meta?.target ?? "").includes("sku")) {
        return { success: false, error: FIX_FIELDS, fieldErrors: { sku: "You already use this SKU on another product" } };
      }
      return { success: false, error: "Another product was saved with the same name just now. Please try again." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { success: false, error: "A category or brand you chose was just removed. Please choose again." };
    }
    console.error("[vendor products] update failed", error instanceof Error ? error.message : error);
    return { success: false, error: SAVE_FAILED };
  }

  // Committed: now remove files that are no longer referenced.
  const stillUsed = new Set([thumbnail, ...galleryUrls, ...nextVariations.map((v) => v.image)].filter(Boolean));
  const old = [current.thumbnail, ...current.images.map((i) => i.url), ...current.variations.map((v) => v.image)];
  await Promise.all(old.filter((u): u is string => !!u && !stillUsed.has(u)).map((u) => deleteProductImage(u)));

  revalidatePath("/vendor/products");
  revalidatePath(`/vendor/products/${id}`);
  return { success: true, data: { id, approvalStatus, reReview: approvalStatus === "PENDING" && current.approvalStatus !== "PENDING" } };
}

/**
 * Shopper-facing changes that need the admin to look again: name, short/long description, type, category
 * path, brand, price/discount, thumbnail/gallery, video, the set of variations or their prices.
 * Stock, SKU, unit, minimum order, shipping, tags and SEO are operational and don't.
 */
function needsReReview(
  before: {
    name: string;
    shortDescription: string | null;
    description: string;
    productType: string;
    categoryId: string;
    subCategoryId: string | null;
    subSubCategoryId: string | null;
    brandId: string | null;
    price: number;
    discountType: string;
    discountValue: number;
    thumbnail: string | null;
    videoUrl: string | null;
    images: { url: string }[];
    variations: { name: string; price: number; image: string | null }[];
  },
  after: Pick<ProductFormData, "name" | "shortDescription" | "description" | "productType" | "categoryId" | "subCategoryId" | "subSubCategoryId" | "brandId" | "price" | "discountType" | "discountValue" | "videoUrl"> & {
    thumbnail: string | null;
    galleryUrls: string[];
    variations: { name: string; price: number; image: string | null }[];
  },
) {
  const keys = ["name", "shortDescription", "description", "productType", "categoryId", "subCategoryId", "subSubCategoryId", "brandId", "price", "discountType", "discountValue", "thumbnail", "videoUrl"] as const;
  if (keys.some((k) => before[k] !== after[k])) return true;
  if (before.images.map((i) => i.url).join("|") !== after.galleryUrls.join("|")) return true;
  const sig = (vs: { name: string; price: number; image: string | null }[]) => vs.map((v) => `${v.name}:${v.price}:${v.image ?? ""}`).join("|");
  return sig(before.variations) !== sig(after.variations);
}
