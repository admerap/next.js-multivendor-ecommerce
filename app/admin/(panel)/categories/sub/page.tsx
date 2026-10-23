import { FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pagination } from "@/components/data/Pagination";
import { AddSubCategoryButton } from "@/components/admin/categories/AddSubCategoryButton";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar } from "@/components/data/ListToolbar";
import { MissingParentState } from "@/components/admin/categories/MissingParentState";
import { NoMatches } from "@/components/data/NoMatches";
import { SubCategoriesTable } from "@/components/admin/categories/SubCategoriesTable";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requireArea } from "@/lib/auth-guard";
import { CATEGORY_ROUTES } from "@/lib/categories";
import { subCategoryListSchema } from "@/lib/validations/category";
import { getCategoryOptions } from "../actions";
import { getSubCategories } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Sub-Categories" };

export default async function SubCategoriesPage({ searchParams }: PageProps<"/admin/categories/sub">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const params = subCategoryListSchema.parse(firstParams(sp));

  const [res, catRes] = await Promise.all([getSubCategories(params), getCategoryOptions()]);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load sub-categories"); // → error.tsx (Retry)
  if (!catRes.success || !catRes.data) throw new Error(catRes.error ?? "Couldn't load categories");
  const categories = catRes.data;
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL" || params.category !== "";
  const noCategories = categories.length === 0;

  const add = <AddSubCategoryButton categories={categories} />;
  const emptyState = noCategories ? (
    <MissingParentState
      icon={FolderOpen}
      title="No sub-categories yet"
      description="Add a category first — every sub-category belongs to one."
      href={CATEGORY_ROUTES.category}
      cta="Go to Categories"
    />
  ) : (
    <EmptyState bare icon={FolderOpen} title="No sub-categories yet" description="Group each category into sub-categories, like Audio or Wearables under Electronics.">
      {add}
    </EmptyState>
  );

  const card = (children: ReactNode) => (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar
        searchLabel="Search sub-categories by name"
        filters={[{ param: "category", label: "Filter by category", allLabel: "All categories", options: categories.map((c) => ({ id: c.id, label: c.name })) }]}
      />
      <div className="border-t border-line">{children}</div>
    </section>
  );

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Category Setup" }, { label: "Sub-Categories" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={FolderOpen} title="Sub-Categories" total={total} noun="sub-categories" />}
        actions={noCategories ? undefined : add}
        loading={<ListSkeleton label="Loading sub-categories" />}
        empty={card(emptyState)}
        error={{ title: "Couldn't load sub-categories", description: "Something went wrong reaching the catalog. Check your connection and try again." }}
      >
        {card(
          total === 0 && !filtered ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <SubCategoriesTable items={items} offset={(page - 1) * pageSize} categories={categories} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                noun="sub-categories"
                params={{
                  q: params.q || undefined,
                  status: params.status === "ALL" ? undefined : params.status,
                  category: params.category || undefined,
                  pageSize: pageSize === 10 ? undefined : String(pageSize),
                }}
              />
            </>
          ) : (
            <NoMatches noun="sub-categories" q={params.q} />
          ),
        )}
      </PreviewStateFrame>
    </>
  );
}
