import { CircleCheck, CircleX, Clock3, Flame, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getAdminProductFilters, getAdminProducts } from "@/app/admin/(panel)/products/actions";
import { Pagination } from "@/components/data/Pagination";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListToolbar, type ToolbarFilter } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { ProductsSkeleton } from "@/components/products/ProductsSkeleton";
import { adminProductListSchema, type AdminProductView } from "@/lib/validations/admin-product";
import { AdminProductTable, PendingProductTable } from "./AdminProductTable";
import { firstParams } from "@/lib/list-params";

type ViewConfig = { title: string; icon: LucideIcon; noun: string; empty: { title: string; description: string } };

/** Copy of each Product Manage list (sidebar order). */
const PRODUCT_VIEWS: Record<AdminProductView, ViewConfig> = {
  pending: {
    title: "Pending Products",
    icon: Clock3,
    noun: "pending products",
    empty: { title: "No product requests", description: "When stores submit new products for review, they appear here." },
  },
  approved: {
    title: "Approved Products",
    icon: CircleCheck,
    noun: "approved products",
    empty: { title: "No approved products", description: "Products you approve appear here and can go live on the storefront." },
  },
  denied: {
    title: "Denied Products",
    icon: CircleX,
    noun: "denied products",
    empty: { title: "No denied products", description: "Products you deny appear here until the vendor edits and resubmits them." },
  },
  featured: {
    title: "Featured Products",
    icon: Sparkles,
    noun: "featured products",
    empty: { title: "No featured products", description: "Check Featured on an approved product (in its details page or in Approved Products) to list it here." },
  },
  popular: {
    title: "Popular Products",
    icon: Flame,
    noun: "popular products",
    empty: { title: "No popular products", description: "Check Most Popular on an approved product (in its details page or in Approved Products) to list it here." },
  },
};

const ERROR = { title: "Couldn't load products", description: "The catalog service didn't respond. Check your connection and try again." };

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/**
 * One Product Manage list (adminvendorproductlist design), shared by the five routes: heading with
 * count, search + vendor/category/active filters + page size, table→cards, pagination, 4 states.
 */
export async function AdminProductList({ view, searchParams }: { view: AdminProductView; searchParams: Record<string, string | string[] | undefined> }) {
  const cfg = PRODUCT_VIEWS[view];
  const params = adminProductListSchema.parse(firstParams(searchParams));

  const [res, filtersRes] = await Promise.all([getAdminProducts(params, view), getAdminProductFilters(view)]);
  if (!res.success || !res.data || !filtersRes.success || !filtersRes.data) throw new Error(res.error ?? filtersRes.error ?? ERROR.title); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.vendor !== "" || params.category !== "" || params.status !== "ALL";

  const filters: ToolbarFilter[] = [
    { param: "vendor", label: "Filter by vendor", allLabel: "All vendors", options: filtersRes.data.vendors },
    { param: "category", label: "Filter by category", allLabel: "All categories", options: filtersRes.data.categories },
  ];
  const emptyState = <EmptyState bare icon={cfg.icon} title={cfg.empty.title} description={cfg.empty.description} />;
  const card = (children: ReactNode) => (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar searchLabel="Search by product name or SKU" filters={filters} statuses={STATUSES} />
      <div className="border-t border-line">{children}</div>
    </section>
  );

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Product Manage" }, { label: cfg.title }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={cfg.icon} title={cfg.title} total={total} noun={cfg.noun} />}
        loading={<ProductsSkeleton />}
        empty={<section className="rounded-lg bg-card shadow-sm">{emptyState}</section>}
        error={ERROR}
      >
        {total === 0 && !filtered ? (
          <section className="rounded-lg bg-card shadow-sm">{emptyState}</section>
        ) : (
          card(
            items.length > 0 ? (
              <>
                <div className="pt-4 xl:pt-0">
                  {view === "pending" ? (
                    <PendingProductTable items={items} />
                  ) : (
                    <AdminProductTable
                      items={items}
                      offset={(page - 1) * pageSize}
                      withFlags={view === "approved" || view === "featured" || view === "popular"}
                      detailsOnly={view === "approved"}
                    />
                  )}
                </div>
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  pageSize={pageSize}
                  noun={cfg.noun}
                  params={{
                    q: params.q || undefined,
                    vendor: params.vendor || undefined,
                    category: params.category || undefined,
                    status: params.status === "ALL" ? undefined : params.status,
                    pageSize: pageSize === 10 ? undefined : String(pageSize),
                  }}
                />
              </>
            ) : (
              <NoMatches noun={cfg.noun} q={params.q} />
            ),
          )
        )}
      </PreviewStateFrame>
    </>
  );
}
