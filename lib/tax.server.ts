import "server-only";

import { prisma } from "@/lib/db";
import { US_STATES } from "@/lib/regions";

const STATE_NAME = new Map<string, string>(US_STATES.map(([code, name]) => [code, name]));

export type TaxRateRow = { id: string; country: string; region: string; name: string; rate: number; isActive: boolean; updatedAt: Date };

/** Every configured sales-tax rate (Admin › Settings › Tax Rates), US states A→Z by name. */
export async function listTaxRates(): Promise<TaxRateRow[]> {
  const rows = await prisma.taxRate.findMany({ orderBy: [{ country: "asc" }, { region: "asc" }] });
  return rows
    .map((r) => ({ id: r.id, country: r.country, region: r.region, name: STATE_NAME.get(r.region) ?? r.region, rate: r.rate, isActive: r.isActive, updatedAt: r.updatedAt }))
    .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
}
