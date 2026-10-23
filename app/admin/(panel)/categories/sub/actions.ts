"use server";

import type { CategoryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  duplicate,
  forbidden,
  invalid,
  isAdmin,
  isForeignKeyError,
  isNotFoundError,
  isUniqueError,
  plural,
  productCounts,
  revalidateCategoryPages,
  uniqueSlug,
  type ActionResult,
} from "@/lib/category-actions";
import { categoryIdSchema, categoryStatusSchema, subCategoryListSchema } from "@/lib/validations/category";
import { subCategoryCreateServerSchema, subCategoryUpdateServerSchema } from "@/lib/validations/category.server";

export type SubCategoryRow = {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatus;
  categoryId: string;
  categoryName: string;
  subSubCategoriesCount: number;
  productsCount: number;
  createdAt: string;
};

export type SubCategoryOption = { id: string; name: string; status: CategoryStatus };

const DUPLICATE = "This category already has a sub-category with this name";
const GONE = "This sub-category no longer exists.";

const ROW_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  categoryId: true,
  createdAt: true,
  category: { select: { name: true } },
  _count: { select: { subSubCategories: true } },
} satisfies Prisma.SubCategorySelect;

function toRow(s: Prisma.SubCategoryGetPayload<{ select: typeof ROW_SELECT }>, productsCount: number): SubCategoryRow {
  const { _count, category, createdAt, ...rest } = s;
  return { ...rest, categoryName: category.name, subSubCategoriesCount: _count.subSubCategories, productsCount, createdAt: createdAt.toISOString() };
}

const slugFor = (name: string, exceptId?: string) =>
  uniqueSlug(name, "sub-category", (base) =>
    prisma.subCategory.findMany({ where: { slug: { startsWith: base }, ...(exceptId && { NOT: { id: exceptId } }) }, select: { slug: true } }),
  );

/** Names are unique within their category (case-insensitive, per the DB collation). */
const nameTaken = async (name: string, categoryId: string, exceptId?: string) =>
  !!(await prisma.subCategory.findFirst({ where: { name, categoryId, ...(exceptId && { NOT: { id: exceptId } }) }, select: { id: true } }));

const readForm = (fd: FormData) => ({ id: fd.get("id") ?? undefined, name: fd.get("name"), status: fd.get("status"), categoryId: fd.get("categoryId") });

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getSubCategories(
  params: unknown,
): Promise<ActionResult<{ items: SubCategoryRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, status, category, page, pageSize } = subCategoryListSchema.parse(params ?? {});
  const where: Prisma.SubCategoryWhereInput = {
    ...(q && { name: { contains: q } }),
    ...(status !== "ALL" && { status }),
    ...(category && { categoryId: category }),
  };

  try {
    const total = await prisma.subCategory.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.subCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (current - 1) * pageSize, take: pageSize, select: ROW_SELECT });
    const counts = await productCounts(rows.map((r) => r.id));
    return { success: true, data: { items: rows.map((r) => toRow(r, counts.get(r.id) ?? 0)), total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[sub-categories] list failed", error);
    return { success: false, error: "We couldn't load sub-categories. Please try again." };
  }
}

/** The dependent dropdown: only the chosen category's sub-categories, A→Z. */
export async function getSubCategoriesByCategory(categoryId: unknown): Promise<ActionResult<SubCategoryOption[]>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryIdSchema.safeParse({ id: categoryId });
  if (!parsed.success) return { success: false, error: "Choose a category" };
  try {
    const data = await prisma.subCategory.findMany({ where: { categoryId: parsed.data.id }, orderBy: { name: "asc" }, select: { id: true, name: true, status: true } });
    return { success: true, data };
  } catch (error) {
    console.error("[sub-categories] by category failed", error);
    return { success: false, error: "We couldn't load sub-categories. Please try again." };
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createSubCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = await subCategoryCreateServerSchema.safeParseAsync(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, status, categoryId } = parsed.data;
  if (await nameTaken(name, categoryId)) return duplicate(DUPLICATE);

  try {
    const created = await prisma.subCategory.create({ data: { name, status, categoryId, slug: await slugFor(name) }, select: { id: true } });
    revalidateCategoryPages();
    return { success: true, data: created };
  } catch (error) {
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    if (isForeignKeyError(error)) return { success: false, error: "Choose a valid category", fieldErrors: { categoryId: "Choose a valid category" } };
    console.error("[sub-categories] create failed", error);
    return { success: false, error: "We couldn't create the sub-category. Please try again." };
  }
}

export async function updateSubCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = await subCategoryUpdateServerSchema.safeParseAsync(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, status, categoryId } = parsed.data;

  const current = await prisma.subCategory.findUnique({ where: { id }, select: { name: true, categoryId: true } });
  if (!current) return { success: false, error: GONE };
  if (await nameTaken(name, categoryId, id)) return duplicate(DUPLICATE);

  try {
    await prisma.$transaction([
      prisma.subCategory.update({
        where: { id },
        data: { name, status, categoryId, ...(name !== current.name && { slug: await slugFor(name, id) }) },
      }),
      // Moving to another category: its sub-sub-categories move with it (they store categoryId too).
      ...(categoryId !== current.categoryId ? [prisma.subSubCategory.updateMany({ where: { subCategoryId: id }, data: { categoryId } })] : []),
    ]);
    revalidateCategoryPages();
    return { success: true, data: { id } };
  } catch (error) {
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-categories] update failed", error);
    return { success: false, error: "We couldn't save the sub-category. Please try again." };
  }
}

export async function toggleSubCategoryStatus(input: unknown): Promise<ActionResult<{ status: CategoryStatus }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid status change." };
  try {
    const row = await prisma.subCategory.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status }, select: { status: true } });
    revalidateCategoryPages();
    return { success: true, data: row };
  } catch (error) {
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-categories] toggle failed", error);
    return { success: false, error: "We couldn't update the status. Please try again." };
  }
}

export async function deleteSubCategory(input: unknown): Promise<ActionResult<{ subSubCategoriesCount?: number; productsCount?: number }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid sub-category." };
  const { id } = parsed.data;

  const found = await prisma.subCategory.findUnique({ where: { id }, select: { name: true, _count: { select: { subSubCategories: true } } } });
  if (!found) return { success: false, error: GONE };

  // Never cascade: block while anything still hangs off this sub-category.
  const subSubCategoriesCount = found._count.subSubCategories;
  const productsCount = (await productCounts([id])).get(id) ?? 0;
  if (subSubCategoriesCount > 0 || productsCount > 0) {
    const parts = [
      subSubCategoriesCount > 0 && plural(subSubCategoriesCount, "sub-sub-category", "sub-sub-categories"),
      productsCount > 0 && plural(productsCount, "product", "products"),
    ].filter(Boolean);
    return {
      success: false,
      error: `"${found.name}" still has ${parts.join(" and ")}. Delete or move them to another sub-category first, or deactivate it instead.`,
      data: { subSubCategoriesCount, productsCount },
    };
  }

  try {
    await prisma.subCategory.delete({ where: { id } });
    revalidateCategoryPages();
    return { success: true, data: {} };
  } catch (error) {
    if (isForeignKeyError(error)) return { success: false, error: `"${found.name}" still has items under it. Refresh and try again.` };
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-categories] delete failed", error);
    return { success: false, error: "We couldn't delete the sub-category. Please try again." };
  }
}
