"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/access.server";
import { forbiddenResult } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { percentToRate, taxRateUpdateSchema } from "@/lib/validations/tax";

export type TaxRateResult = { success: true; data: { rate: number; isActive: boolean; updatedAt: string } } | { success: false; error: string; fieldError?: string };

/**
 * Admin › Settings › Tax Rates › Save a row: its rate (entered as a percent, stored in thousandths of
 * a percent) and whether it's active. Admin-only, Zod-validated. Checkout reads the rates live, so
 * new orders use the change right away; placed orders keep the rate they were charged.
 */
export async function updateTaxRate(input: unknown): Promise<TaxRateResult> {
  if (!(await can("taxRates", "update"))) return forbiddenResult("tax rates");
  const parsed = taxRateUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the rate";
    return { success: false, error: message, fieldError: message };
  }
  const { id, percent, isActive } = parsed.data;
  try {
    const row = await prisma.taxRate.update({ where: { id }, data: { rate: percentToRate(percent), isActive }, select: { rate: true, isActive: true, updatedAt: true } });
    revalidatePath("/admin/settings/tax-rates");
    return { success: true, data: { ...row, updatedAt: row.updatedAt.toISOString() } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: "That tax rate no longer exists." };
    console.error("[tax rates] update failed:", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "unknown");
    return { success: false, error: "We couldn't save this rate. Please try again." };
  }
}
