import { Info, Percent } from "lucide-react";
import type { Metadata } from "next";
import { TaxRatesEditor } from "@/components/admin/settings/TaxRatesEditor";
import { TaxRatesSkeleton } from "@/components/admin/settings/TaxRatesSkeleton";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requirePermission } from "@/lib/access.server";
import { listTaxRates } from "@/lib/tax.server";

export const metadata: Metadata = { title: "Tax Rates" };

const empty = <EmptyState icon={Percent} title="No tax rates yet" description="Add sales-tax rates to start charging tax at checkout." />;

/**
 * Admin › Settings › Tax Rates: the sales tax checkout charges by ship-to state (items after coupons;
 * shipping isn't taxed). Seeded with each state's base rate — county / city taxes are not included.
 */
export default async function TaxRatesPage() {
  await requirePermission("taxRates");
  const rates = await listTaxRates();
  const active = rates.filter((r) => r.isActive && r.rate > 0).length;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Settings" }, { label: "Tax Rates" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
              <Percent aria-hidden className="size-5" strokeWidth={1.9} />
            </span>
            Tax Rates
            <span className="rounded-full bg-card px-2.5 py-0.5 font-sans text-sm font-bold text-fg-muted tabular-nums shadow-xs" aria-label={`${rates.length} regions`}>
              {rates.length}
            </span>
          </h1>
        }
        loading={<TaxRatesSkeleton />}
        empty={empty}
        error={{ title: "Couldn't load tax rates", description: "Something went wrong reaching the database. Check your connection and try again." }}
      >
        <p className="mt-4 mb-5 flex items-start gap-2.5 rounded-md bg-iris-50 px-4 py-3 text-sm text-primary">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <span>
            Checkout charges the <b>ship-to state&apos;s</b> rate on items after coupons; shipping isn&apos;t taxed. These are statewide <b>base</b> rates — county
            and city taxes aren&apos;t included. {active} of {rates.length} regions currently charge tax.
          </span>
        </p>
        {rates.length === 0 ? (
          empty
        ) : (
          <section aria-label="Sales tax by state" className="rounded-lg bg-card shadow-sm">
            <TaxRatesEditor rates={rates.map((r) => ({ id: r.id, region: r.region, name: r.name, rate: r.rate, isActive: r.isActive, updatedAt: r.updatedAt.toISOString() }))} />
          </section>
        )}
      </PreviewStateFrame>
    </>
  );
}
