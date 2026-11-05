import { z } from "zod";

/** Highest sales-tax rate an admin can enter (no US state is anywhere near it). */
export const TAX_RATE_MAX_PERCENT = 20;

/** "6.875" (percent, up to 3 decimals) → 6875 (thousandths of a percent), exactly — no float drift. */
export function percentToRate(percent: string): number {
  const [whole = "0", frac = ""] = percent.trim().split(".");
  return Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
}
/** 6875 → "6.875", 6350 → "6.35", 4000 → "4" (for the input). */
export const rateToPercent = (rate: number) => String(Number((rate / 1000).toFixed(3)));

/** Admin › Settings › Tax Rates › Save one row. */
export const taxRateUpdateSchema = z.object({
  id: z.string().trim().min(1).max(40),
  percent: z
    .string("Enter a rate")
    .trim()
    .min(1, "Enter a rate")
    .regex(/^\d{1,2}(\.\d{1,3})?$/, "Use a percentage like 6.35 (up to 3 decimals)")
    .refine((v) => percentToRate(v) <= TAX_RATE_MAX_PERCENT * 1000, `Rates go up to ${TAX_RATE_MAX_PERCENT}%`),
  isActive: z.boolean(),
});
export type TaxRateUpdateInput = z.infer<typeof taxRateUpdateSchema>;
