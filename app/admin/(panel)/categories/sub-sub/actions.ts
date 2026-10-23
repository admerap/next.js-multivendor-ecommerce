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
import { categoryIdSchema, categoryStatusSchema, subSubCategoryListSchema } from "@/lib/validations/category";
import { subSubCategoryCreateServerSchema, subSubCategoryUpdateServerSchema } from "@/lib/validations/category.server";

export type SubSubCategoryRow = {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatus;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  productsCount: number;
  createdAt: string;
};

const DUPLICATE = "This sub-category already has a sub-sub-category with this name";
const GONE = "This sub-sub-category no longer exists.";

const ROW_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  categoryId: true,
  subCategoryId: true,
  createdAt: true,
  category: { select: { name: true } },
  subCategory: { select: { name: true } },
} satisfies Prisma.SubSubCategorySelect;

function toRow(s: Prisma.SubSubCategoryGetPayload<{ select: typeof ROW_SELECT }>, productsCount: number): SubSubCategoryRow {
  const { category, subCategory, createdAt, ...rest } = s;
  return { ...rest, categoryName: category.name, subCategoryName: subCategory.name, productsCount, createdAt: createdAt.toISOString() };
}

const slugFor = (name: string, exceptId?: string) =>
  uniqueSlug(name, "sub-sub-category", (base) =>
    prisma.subSubCategory.findMany({ where: { slug: { startsWith: base }, ...(exceptId && { NOT: { id: exceptId } }) }, select: { slug: true } }),
  );

/** Names are unique within their sub-category (case-insensitive, per the DB collation). */
const nameTaken = async (name: string, subCategoryId: string, exceptId?: string) =>
  !!(await prisma.subSubCategory.findFirst({ where: { name, subCategoryId, ...(exceptId && { NOT: { id: exceptId } }) }, select: { id: true } }));

const readForm = (fd: FormData) => ({
  id: fd.get("id") ?? undefined,
  name: fd.get("name"),
  status: fd.get("status"),
  categoryId: fd.get("categoryId"),
  subCategoryId: fd.get("subCategoryId"),
});

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getSubSubCategories(
  params: unknown,
): Promise<ActionResult<{ items: SubSubCategoryRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, status, category, sub, page, pageSize } = subSubCategoryListSchema.parse(params ?? {});
  const where: Prisma.SubSubCategoryWhereInput = {
    ...(q && { name: { contains: q } }),
    ...(status !== "ALL" && { status }),
    ...(category && { categoryId: category }),
    ...(sub && { subCategoryId: sub }),
  };

  try {
    const total = await prisma.subSubCategory.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.subSubCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (current - 1) * pageSize, take: pageSize, select: ROW_SELECT });
    const counts = await productCounts(rows.map((r) => r.id));
    return { success: true, data: { items: rows.map((r) => toRow(r, counts.get(r.id) ?? 0)), total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[sub-sub-categories] list failed", error);
    return { success: false, error: "We couldn't load sub-sub-categories. Please try again." };
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createSubSubCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  // The server schema re-checks that the sub-category belongs to the chosen category.
  const parsed = await subSubCategoryCreateServerSchema.safeParseAsync(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, status, categoryId, subCategoryId } = parsed.data;
  if (await nameTaken(name, subCategoryId)) return duplicate(DUPLICATE);

  try {
    const created = await prisma.subSubCategory.create({
      data: { name, status, categoryId, subCategoryId, slug: await slugFor(name) },
      select: { id: true },
    });
    revalidateCategoryPages();
    return { success: true, data: created };
  } catch (error) {
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    if (isForeignKeyError(error)) return { success: false, error: "Choose a valid sub-category", fieldErrors: { subCategoryId: "Choose a valid sub-category" } };
    console.error("[sub-sub-categories] create failed", error);
    return { success: false, error: "We couldn't create the sub-sub-category. Please try again." };
  }
}

export async function updateSubSubCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = await subSubCategoryUpdateServerSchema.safeParseAsync(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, status, categoryId, subCategoryId } = parsed.data;

  const current = await prisma.subSubCategory.findUnique({ where: { id }, select: { name: true } });
  if (!current) return { success: false, error: GONE };
  if (await nameTaken(name, subCategoryId, id)) return duplicate(DUPLICATE);

  try {
    await prisma.subSubCategory.update({
      where: { id },
      data: { name, status, categoryId, subCategoryId, ...(name !== current.name && { slug: await slugFor(name, id) }) },
    });
    revalidateCategoryPages();
    return { success: true, data: { id } };
  } catch (error) {
    if (isUniqueError(error)) return duplicate(DUPLICATE);
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-sub-categories] update failed", error);
    return { success: false, error: "We couldn't save the sub-sub-category. Please try again." };
  }
}

export async function toggleSubSubCategoryStatus(input: unknown): Promise<ActionResult<{ status: CategoryStatus }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid status change." };
  try {
    const row = await prisma.subSubCategory.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status }, select: { status: true } });
    revalidateCategoryPages();
    return { success: true, data: row };
  } catch (error) {
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-sub-categories] toggle failed", error);
    return { success: false, error: "We couldn't update the status. Please try again." };
  }
}

export async function deleteSubSubCategory(input: unknown): Promise<ActionResult<{ productsCount?: number }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid sub-sub-category." };
  const { id } = parsed.data;

  const found = await prisma.subSubCategory.findUnique({ where: { id }, select: { name: true } });
  if (!found) return { success: false, error: GONE };

  // Leaf level: only products can block the delete.
  const productsCount = (await productCounts([id])).get(id) ?? 0;
  if (productsCount > 0) {
    return {
      success: false,
      error: `"${found.name}" is used by ${plural(productsCount, "product", "products")}. Move them to another sub-sub-category first, or deactivate it instead.`,
      data: { productsCount },
    };
  }

  try {
    await prisma.subSubCategory.delete({ where: { id } });
    revalidateCategoryPages();
    return { success: true, data: {} };
  } catch (error) {
    if (isNotFoundError(error)) return { success: false, error: GONE };
    console.error("[sub-sub-categories] delete failed", error);
    return { success: false, error: "We couldn't delete the sub-sub-category. Please try again." };
  }
}
