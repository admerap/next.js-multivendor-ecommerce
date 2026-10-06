"use server";

import type { CategoryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  duplicate,
  forbidden,
  invalid,
  isAdmin,
  isNotFoundError,
  isForeignKeyError,
  isUniqueError,
  plural,
  productCounts,
  revalidateCategoryPages,
  uniqueSlug,
  type ActionResult,
} from "@/lib/category-actions";
import { deleteCategoryImage, saveCategoryImage, UploadError } from "@/lib/uploads";
import {
  categoryCreateSchema,
  categoryIdSchema,
  categoryListSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
} from "@/lib/validations/category";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: CategoryStatus;
  subCategoriesCount: number;
  productsCount: number;
  createdAt: string;
};

export type CategoryOption = { id: string; name: string; status: CategoryStatus };

const DUPLICATE = "A category with this name already exists";
const GONE = "This category no longer exists.";

const ROW_SELECT = {
  id: true,
  name: true,
  slug: true,
  image: true,
  status: true,
  createdAt: true,
  _count: { select: { subCategories: true } },
} satisfies Prisma.CategorySelect;

function toRow(c: Prisma.CategoryGetPayload<{ select: typeof ROW_SELECT }>, productsCount: number): CategoryRow {
  const { _count, createdAt, ...rest } = c;
  return { ...rest, subCategoriesCount: _count.subCategories, productsCount, createdAt: createdAt.toISOString() };
}

const slugFor = (name: string, exceptId?: string) =>
  uniqueSlug(name, "category", (base) =>
    prisma.category.findMany({ where: { slug: { startsWith: base }, ...(exceptId && { NOT: { id: exceptId } }) }, select: { slug: true } }),
  );

const nameTaken = async (name: string, exceptId?: string) =>
  !!(await prisma.category.findFirst({ where: { name, ...(exceptId && { NOT: { id: exceptId } }) }, select: { id: true } }));

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getCategories(
  params: unknown,
): Promise<ActionResult<{ items: CategoryRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, status, category, page, pageSize } = categoryListSchema.parse(params ?? {});
  const where: Prisma.CategoryWhereInput = {
    ...(q && { name: { contains: q } }),
    ...(status !== "ALL" && { status }),
    ...(category && { id: category }),
  };

  try {
    const total = await prisma.category.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.category.findMany({ where, orderBy: { createdAt: "desc" }, skip: (current - 1) * pageSize, take: pageSize, select: ROW_SELECT });
    const counts = await productCounts(rows.map((r) => r.id));
    return { success: true, data: { items: rows.map((r) => toRow(r, counts.get(r.id) ?? 0)), total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[categories] list failed", error);
    return { success: false, error: "We couldn't load categories. Please try again." };
  }
}

export async function getCategory(id: unknown): Promise<ActionResult<CategoryRow | null>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryIdSchema.safeParse({ id });
  if (!parsed.success) return { success: true, data: null };
  try {
    const row = await prisma.category.findUnique({ where: { id: parsed.data.id }, select: ROW_SELECT });
    if (!row) return { success: true, data: null };
    return { success: true, data: toRow(row, (await productCounts([row.id])).get(row.id) ?? 0) };
  } catch (error) {
    console.error("[categories] get failed", error);
    return { success: false, error: "We couldn't load this category. Please try again." };
  }
}

/** Every category, A→Z — for the parent dropdowns and the list filters. */
export async function getCategoryOptions(): Promise<ActionResult<CategoryOption[]>> {
  if (!(await isAdmin())) return forbidden();
  try {
    return { success: true, data: await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } }) };
  } catch (error) {
    console.error("[categories] options failed", error);
    return { success: false, error: "We couldn't load categories. Please try again." };
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryCreateSchema.safeParse({ name: formData.get("name"), status: formData.get("status"), image: formData.get("image") ?? undefined });
  if (!parsed.success) return invalid(parsed.error);
  const { name, status, image } = parsed.data;
  if (await nameTaken(name)) return duplicate(DUPLICATE);

  let imagePath: string | null = null;
  try {
    if (image) imagePath = await saveCategoryImage(image);
    const created = await prisma.category.create({ data: { name, status, slug: await slugFor(name), image: imagePath }, select: { id: true } });
    revalidateCategoryPages();
    return { success: true, data: created };
  } catch (error) {
    await deleteCategoryImage(imagePath); // don't leave an orphan file behind
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { image: error.message } };
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    console.error("[categories] create failed", error);
    return { success: false, error: "We couldn't create the category. Please try again." };
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    image: formData.get("image") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, status, image } = parsed.data;

  const current = await prisma.category.findUnique({ where: { id }, select: { name: true, image: true } });
  if (!current) return { success: false, error: GONE };
  if (await nameTaken(name, id)) return duplicate(DUPLICATE);

  let newImage: string | null = null;
  try {
    if (image) newImage = await saveCategoryImage(image); // no new file → keep the current image
    await prisma.category.update({
      where: { id },
      data: { name, status, ...(name !== current.name && { slug: await slugFor(name, id) }), ...(newImage && { image: newImage }) },
    });
    if (newImage) await deleteCategoryImage(current.image); // replaced → remove the old file
    revalidateCategoryPages();
    return { success: true, data: { id } };
  } catch (error) {
    await deleteCategoryImage(newImage);
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { image: error.message } };
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[categories] update failed", error);
    return { success: false, error: "We couldn't save the category. Please try again." };
  }
}

export async function toggleCategoryStatus(input: unknown): Promise<ActionResult<{ status: CategoryStatus }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid status change." };
  try {
    const row = await prisma.category.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status }, select: { status: true } });
    revalidateCategoryPages();
    return { success: true, data: row };
  } catch (error) {
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[categories] toggle failed", error);
    return { success: false, error: "We couldn't update the status. Please try again." };
  }
}

export async function deleteCategory(input: unknown): Promise<ActionResult<{ subCategoriesCount?: number; productsCount?: number }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid category." };
  const { id } = parsed.data;

  const found = await prisma.category.findUnique({ where: { id }, select: { name: true, image: true, _count: { select: { subCategories: true } } } });
  if (!found) return { success: false, error: GONE };

  // Never cascade: block while anything still hangs off this category.
  const subCategoriesCount = found._count.subCategories;
  const productsCount = (await productCounts([id])).get(id) ?? 0;
  if (subCategoriesCount > 0 || productsCount > 0) {
    const parts = [
      subCategoriesCount > 0 && plural(subCategoriesCount, "sub-category", "sub-categories"),
      productsCount > 0 && plural(productsCount, "product", "products"),
    ].filter(Boolean);
    return {
      success: false,
      error: `"${found.name}" still has ${parts.join(" and ")}. Delete or move them to another category first, or deactivate it instead.`,
      data: { subCategoriesCount, productsCount },
    };
  }

  try {
    await prisma.category.delete({ where: { id } });
    await deleteCategoryImage(found.image);
    revalidateCategoryPages();
    return { success: true, data: {} };
  } catch (error) {
    if (isForeignKeyError(error)) return { success: false, error: `"${found.name}" still has items under it. Refresh and try again.` };
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[categories] delete failed", error);
    return { success: false, error: "We couldn't delete the category. Please try again." };
  }
}
