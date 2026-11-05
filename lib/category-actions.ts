import "server-only";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { forbiddenResult } from "@/lib/admin-auth";
import { CATEGORY_PATHS } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { nextFreeSlug, slugify } from "@/lib/slug";
import { fieldErrorsOf } from "@/lib/form-errors";

/** Helpers shared by the Category / Sub-Category / Sub-Sub-Category server actions. */

export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

/**
 * Every action re-checks the role's permission on the server (`can("categories", …)`, lib/access.server); the
 * page guard is not a security boundary. This is what a refusal returns.
 */
export const forbidden = <T>(): ActionResult<T> => forbiddenResult("categories");

export function invalid<T>(error: z.ZodError): ActionResult<T> {
  return { success: false, error: "Please fix the highlighted fields", fieldErrors: fieldErrorsOf(error.issues) };
}

export const duplicate = <T>(message: string): ActionResult<T> => ({ success: false, error: message, fieldErrors: { name: message } });

export const isUniqueError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
export const isNotFoundError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
export const isForeignKeyError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";

/** Counts and parent names show on all three pages, so every mutation refreshes all of them. */
export function revalidateCategoryPages() {
  for (const p of CATEGORY_PATHS) revalidatePath(p);
}

/** First free slug for `name` among the slugs already taken at that level. */
export async function uniqueSlug(name: string, fallback: string, findTaken: (base: string) => Promise<{ slug: string }[]>) {
  const base = slugify(name, fallback);
  return nextFreeSlug(base, (await findTaken(base)).map((r) => r.slug));
}

/** Products filed under each category / sub / sub-sub (by that level's column). Computed, never stored. */
export async function productCounts(ids: string[], level: "categoryId" | "subCategoryId" | "subSubCategoryId"): Promise<Map<string, number>> {
  const counts = new Map(ids.map((id) => [id, 0]));
  if (ids.length === 0) return counts;
  const groups = await prisma.product.groupBy({ by: [level], where: { [level]: { in: ids } }, _count: { _all: true } });
  for (const g of groups) {
    const id = g[level];
    if (id) counts.set(id, g._count._all);
  }
  return counts;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
