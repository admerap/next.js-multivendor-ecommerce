import { SearchX, Tag } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AddBrandButton } from "@/components/admin/brands/AddBrandButton";
import { BrandsSkeleton } from "@/components/admin/brands/BrandsSkeleton";
import { BrandsTable } from "@/components/admin/brands/BrandsTable";
import { BrandsToolbar } from "@/components/admin/brands/BrandsToolbar";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requireArea } from "@/lib/auth-guard";
import { brandListSchema } from "@/lib/validations/brand";
import { getBrandOptions, getBrands, type BrandOption } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Brands" };

const emptyState = (
  <EmptyState bare icon={Tag} title="No brands yet" description="Add the brands your marketplace sells so shoppers can filter products by them.">
    <AddBrandButton />
  </EmptyState>
);

/** The list card: search + brand + status + page-size toolbar always on top, then the body. */
function BrandsCard({ brands, children }: { brands: BrandOption[]; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <BrandsToolbar brands={brands} />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

export default async function BrandsPage({ searchParams }: PageProps<"/admin/brands">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const params = brandListSchema.parse(firstParams(sp));

  const [res, optRes] = await Promise.all([getBrands(params), getBrandOptions()]);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load brands"); // → error.tsx (Retry)
  if (!optRes.success || !optRes.data) throw new Error(optRes.error ?? "Couldn't load brands");
  const brands = optRes.data;
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL" || params.brand !== "";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Brands" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
              <Tag aria-hidden className="size-5" strokeWidth={1.9} />
            </span>
            Brands
            <span className="rounded-full bg-card px-2.5 py-0.5 font-sans text-sm font-bold text-fg-muted tabular-nums shadow-xs" aria-label={`${total} brands`}>
              {total}
            </span>
          </h1>
        }
        actions={<AddBrandButton />}
        loading={<BrandsSkeleton />}
        empty={<BrandsCard brands={brands}>{emptyState}</BrandsCard>}
        error={{ title: "Couldn't load brands", description: "Something went wrong reaching the catalog. Check your connection and try again." }}
      >
        <BrandsCard brands={brands}>
          {total === 0 && !filtered ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <BrandsTable items={items} offset={(page - 1) * pageSize} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                params={{
                  q: params.q || undefined,
                  status: params.status === "ALL" ? undefined : params.status,
                  brand: params.brand || undefined,
                  pageSize: pageSize === 10 ? undefined : String(pageSize),
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <SearchX aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
              <p className="text-sm text-fg-muted">
                No brands match{params.q ? <> “<b className="text-fg-strong">{params.q}</b>”</> : " these filters"}. Try another name or status.
              </p>
            </div>
          )}
        </BrandsCard>
      </PreviewStateFrame>
    </>
  );
}
