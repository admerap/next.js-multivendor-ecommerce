import "server-only";

import type { ProductEditState, ProductFormValues } from "@/components/vendor/products/form/ProductForm";
import type { OptionState, RowState } from "@/components/vendor/products/form/VariationSetup";
import { prisma } from "@/lib/db";
import { buildCombinations, centsToInput, PRODUCT_UNITS, VARIANT_ATTRIBUTES, type ApprovalStatus, type ProductUnitValue, type VariantAttribute } from "@/lib/validations/product";

/**
 * One of THIS vendor's products, shaped for the edit form. Returns null when the id doesn't exist
 * or belongs to another vendor — callers show 404, so other stores' ids are never confirmed.
 */
export async function getProductForEdit(id: string, vendorId: string): Promise<{ initial: ProductFormValues; edit: ProductEditState; name: string; approvalStatus: ApprovalStatus; rejectionReason: string | null; brandLabel?: string } | null> {
  const p = await prisma.product.findFirst({
    where: { id, vendorId },
    include: { images: { orderBy: { position: "asc" } }, variations: { orderBy: { position: "asc" } }, brand: { select: { name: true } } },
  });
  if (!p) return null;

  const [subs, subSubs] = await Promise.all([
    prisma.subCategory.findMany({ where: { categoryId: p.categoryId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    p.subCategoryId
      ? prisma.subSubCategory.findMany({ where: { subCategoryId: p.subCategoryId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [],
  ]);

  // Saved JSON is re-checked before it reaches the form.
  const rawOptions = Array.isArray(p.variantOptions) ? (p.variantOptions as { name?: unknown; values?: unknown }[]) : [];
  const options: OptionState[] = rawOptions
    .filter((o) => VARIANT_ATTRIBUTES.includes(o.name as VariantAttribute) && Array.isArray(o.values))
    .map((o) => ({ name: o.name as VariantAttribute, values: (o.values as unknown[]).filter((x): x is string => typeof x === "string") }));

  // Every saved variation keeps its values; combinations that weren't saved start as "removed".
  const rows: Record<string, RowState> = {};
  for (const v of p.variations) rows[v.name] = { price: centsToInput(v.price), stock: String(v.stock), sku: v.sku ?? "", url: v.image };
  const saved = new Set(p.variations.map((v) => v.name));
  for (const c of buildCombinations(options)) if (!saved.has(c.name)) rows[c.name] = { removed: true };

  const tags = Array.isArray(p.tags) ? (p.tags as unknown[]).filter((t): t is string => typeof t === "string") : [];

  return {
    name: p.name,
    approvalStatus: p.approvalStatus,
    rejectionReason: p.rejectionReason,
    brandLabel: p.brand?.name,
    initial: {
      name: p.name,
      shortDescription: p.shortDescription ?? "",
      description: p.description,
      productType: p.productType,
      categoryId: p.categoryId,
      subCategoryId: p.subCategoryId ?? "",
      subSubCategoryId: p.subSubCategoryId ?? "",
      brandId: p.brandId ?? "",
      sku: p.sku,
      unit: PRODUCT_UNITS.includes(p.unit as ProductUnitValue) ? (p.unit as ProductUnitValue) : "PC",
      tags,
      price: centsToInput(p.price),
      minOrderQty: String(p.minOrderQty),
      stock: String(p.stock),
      discountType: p.discountType,
      discountValue: p.discountType === "FLAT" ? (p.discountValue ? centsToInput(p.discountValue) : "0") : String(p.discountValue),
      shippingCost: centsToInput(p.shippingCost),
      shippingPerUnit: p.shippingPerUnit,
      hasVariations: p.variations.length > 0,
      videoUrl: p.videoUrl ?? "",
      metaTitle: p.metaTitle ?? "",
      metaDescription: p.metaDescription ?? "",
    },
    edit: { id: p.id, thumbnailUrl: p.thumbnail, gallery: p.images.map((i) => i.url), options, rows, subs, subSubs },
  };
}
