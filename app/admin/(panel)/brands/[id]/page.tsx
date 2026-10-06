import { CalendarDays, CircleCheck, CircleOff, Link2, Package, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandDetailActions } from "@/components/admin/brands/BrandDetailActions";
import { BrandStatusBadge } from "@/components/admin/brands/BrandStatusBadge";
import { BrandThumb } from "@/components/admin/brands/BrandThumb";
import { DashCard, EmptyState, IconTile } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { requireArea } from "@/lib/auth-guard";
import type { Tone } from "@/lib/tones";
import { getBrand } from "../actions";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export async function generateMetadata({ params }: PageProps<"/admin/brands/[id]">): Promise<Metadata> {
  const { id } = await params;
  const res = await getBrand(id);
  return { title: res.data?.name ?? "Brand" };
}

export default async function BrandDetailPage({ params }: PageProps<"/admin/brands/[id]">) {
  await requireArea("ADMIN");
  const { id } = await params;
  const res = await getBrand(id);
  if (!res.success) throw new Error(res.error ?? "Couldn't load this brand");
  const brand = res.data;
  if (!brand) notFound();

  const stats: { label: string; value: number; tone: Tone; icon: typeof Package }[] = [
    { label: "Total products", value: brand.products.total, tone: "iris", icon: Package },
    { label: "Active products", value: brand.products.active, tone: "success", icon: CircleCheck },
    { label: "Inactive products", value: brand.products.inactive, tone: "neutral", icon: CircleOff },
  ];

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Brands", href: "/admin/brands" },
          { label: brand.name },
        ]}
      />

      {/* Header card */}
      <section className="flex flex-wrap items-center gap-5 rounded-lg bg-card p-5 shadow-sm sm:p-6">
        <BrandThumb src={brand.image} name={brand.name} size={96} className="rounded-lg" />
        <div className="min-w-0 flex-[1_1_240px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] break-words text-fg-strong">
              {brand.name}
            </h1>
            <BrandStatusBadge status={brand.status} />
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-fg-muted">
            <div className="flex items-center gap-1.5">
              <dt>
                <Link2 aria-label="Slug" className="size-3.5" strokeWidth={2} />
              </dt>
              <dd>{brand.slug}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>
                <CalendarDays aria-label="Created" className="size-3.5" strokeWidth={2} />
              </dt>
              <dd>Created {dateFmt.format(new Date(brand.createdAt))}</dd>
            </div>
          </dl>
        </div>
        <BrandDetailActions brand={brand} />
      </section>

      {/* Stats */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 rounded-lg bg-card p-5 shadow-sm">
            <div>
              <div className="text-caption font-semibold text-fg-muted">{s.label}</div>
              <div className="mt-1 font-display text-[1.6rem] font-extrabold text-fg-strong tabular-nums">{s.value}</div>
            </div>
            <IconTile icon={s.icon} tone={s.tone} size="lg" />
          </div>
        ))}
      </div>

      {/* Products under this brand. TODO(catalog): render the product table once Product has brandId. */}
      <DashCard title="Products" icon={PackageOpen}>
        <div className="mt-2">
          <EmptyState
            bare
            icon={PackageOpen}
            title="No products under this brand yet"
            description={`Products that stores list under ${brand.name} will appear here with their price, stock and status.`}
          />
        </div>
      </DashCard>
    </>
  );
}
