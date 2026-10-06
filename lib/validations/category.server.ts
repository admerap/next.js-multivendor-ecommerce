import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  subCategoryCreateSchema,
  subCategoryUpdateSchema,
  subSubCategoryCreateSchema,
  subSubCategoryUpdateSchema,
} from "./category";

/*
 * Server-side validation that needs the database. Never trust parent ids sent by the client:
 * the parent must exist, and a sub-sub-category's sub-category must belong to the chosen category.
 * Use with `safeParseAsync`.
 */

async function categoryExists(v: { categoryId: string }, ctx: z.RefinementCtx) {
  const found = await prisma.category.findUnique({ where: { id: v.categoryId }, select: { id: true } });
  if (!found) ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a valid category" });
}

async function subCategoryInCategory(v: { categoryId: string; subCategoryId: string }, ctx: z.RefinementCtx) {
  const sub = await prisma.subCategory.findUnique({ where: { id: v.subCategoryId }, select: { categoryId: true } });
  if (!sub) {
    ctx.addIssue({ code: "custom", path: ["subCategoryId"], message: "Choose a valid sub-category" });
    return;
  }
  if (sub.categoryId !== v.categoryId) {
    ctx.addIssue({ code: "custom", path: ["subCategoryId"], message: "This sub-category doesn't belong to the selected category" });
  }
}

export const subCategoryCreateServerSchema = subCategoryCreateSchema.superRefine(categoryExists);
export const subCategoryUpdateServerSchema = subCategoryUpdateSchema.superRefine(categoryExists);

/** subCategoryInCategory also covers "category exists": a real sub-category always has a real category. */
export const subSubCategoryCreateServerSchema = subSubCategoryCreateSchema.superRefine(subCategoryInCategory);
export const subSubCategoryUpdateServerSchema = subSubCategoryUpdateSchema.superRefine(subCategoryInCategory);
