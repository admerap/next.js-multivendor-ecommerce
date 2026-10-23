import { FolderTree } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pagination } from "@/components/data/Pagination";
import { AddCategoryButton } from "@/components/admin/categories/AddCategoryButton";
import { CategoriesTable } from "@/components/admin/categories/CategoriesTable";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requireArea } from "@/lib/auth-guard";
import { categoryListSchema } from "@/lib/validations/category";
import { getCategories, getCategoryOptions, type CategoryOption } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Categories" };

const emptyState = (
  <EmptyState bare icon={FolderTree} title="No categories yet" description="Add the top-level departments shoppers browse from the All Categories menu.">
    <AddCategoryButton />
  </EmptyState>
);

/** The list card: search + category + status + page-size toolbar always on top, then the body. */
function ListCard({ categories, children }: { categories: CategoryOption[]; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar
        searchLabel="Search categories by name"
        filters={[{ param: "category", label: "Filter by category", allLabel: "All categories", options: categories.map((c) => ({ id: c.id, label: c.name })) }]}
      />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const params = categoryListSchema.parse(firstParams(sp));

  const [res, catRes] = await Promise.all([getCategories(params), getCategoryOptions()]);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load categories"); // → error.tsx (Retry)
  if (!catRes.success || !catRes.data) throw new Error(catRes.error ?? "Couldn't load categories");
  const categories = catRes.data;
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL" || params.category !== "";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Category Setup" }, { label: "Categories" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={FolderTree} title="Categories" total={total} noun="categories" />}
        actions={<AddCategoryButton />}
        loading={<ListSkeleton label="Loading categories" withImage />}
        empty={<ListCard categories={categories}>{emptyState}</ListCard>}
        error={{ title: "Couldn't load categories", description: "Something went wrong reaching the catalog. Check your connection and try again." }}
      >
        <ListCard categories={categories}>
          {total === 0 && !filtered ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <CategoriesTable items={items} offset={(page - 1) * pageSize} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                noun="categories"
                params={{
                  q: params.q || undefined,
                  status: params.status === "ALL" ? undefined : params.status,
                  category: params.category || undefined,
                  pageSize: pageSize === 10 ? undefined : String(pageSize),
                }}
              />
            </>
          ) : (
            <NoMatches noun="categories" q={params.q} />
          )}
        </ListCard>
      </PreviewStateFrame>
    </>
  );
}
