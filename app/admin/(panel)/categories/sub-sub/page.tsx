import { Folder } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pagination } from "@/components/admin/brands/Pagination";
import { AddSubSubCategoryButton } from "@/components/admin/categories/AddSubSubCategoryButton";
import { ListPageHeading } from "@/components/admin/categories/ListPageHeading";
import { ListSkeleton } from "@/components/admin/categories/ListSkeleton";
import { ListToolbar } from "@/components/admin/categories/ListToolbar";
import { MissingParentState } from "@/components/admin/categories/MissingParentState";
import { NoMatches } from "@/components/admin/categories/NoMatches";
import { SubSubCategoriesTable } from "@/components/admin/categories/SubSubCategoriesTable";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requireArea } from "@/lib/auth-guard";
import { CATEGORY_ROUTES } from "@/lib/categories";
import { subSubCategoryListSchema } from "@/lib/validations/category";
import { getCategoryOptions } from "../actions";
import { getSubCategories, getSubCategoriesByCategory } from "../sub/actions";
import { getSubSubCategories } from "./actions";

export const metadata: Metadata = { title: "Sub-Sub-Categories" };

export default async function SubSubCategoriesPage({ searchParams }: PageProps<"/admin/categories/sub-sub">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const raw = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const params = subSubCategoryListSchema.parse(raw);

  const [res, catRes, subsRes, filterSubsRes] = await Promise.all([
    getSubSubCategories(params),
    getCategoryOptions(),
    getSubCategories({ pageSize: 10 }), // only the total matters: are there any sub-categories at all?
    params.category ? getSubCategoriesByCategory(params.category) : Promise.resolve({ success: true, data: [] }),
  ]);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load sub-sub-categories"); // → error.tsx (Retry)
  if (!catRes.success || !catRes.data || !subsRes.success || !subsRes.data) throw new Error("Couldn't load categories");
  const categories = catRes.data;
  const filterSubs = filterSubsRes.success ? (filterSubsRes.data ?? []) : [];
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL" || params.category !== "" || params.sub !== "";
  const noSubCategories = subsRes.data.total === 0;

  const add = <AddSubSubCategoryButton categories={categories} />;
  const emptyState = noSubCategories ? (
    <MissingParentState
      icon={Folder}
      title="No sub-sub-categories yet"
      description="Add a sub-category first — every sub-sub-category belongs to one."
      href={CATEGORY_ROUTES.sub}
      cta="Go to Sub-Categories"
    />
  ) : (
    <EmptyState bare icon={Folder} title="No sub-sub-categories yet" description="The most specific level, like Headphones under Electronics › Audio.">
      {add}
    </EmptyState>
  );

  const card = (children: ReactNode) => (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar
        searchLabel="Search sub-sub-categories by name"
        filters={[
          { param: "category", label: "Filter by category", allLabel: "All categories", options: categories.map((c) => ({ id: c.id, label: c.name })), clears: ["sub"] },
          {
            param: "sub",
            label: "Filter by sub-category",
            allLabel: "All sub-categories",
            options: filterSubs.map((s) => ({ id: s.id, label: s.name })),
            disabled: !params.category,
          },
        ]}
      />
      <div className="border-t border-line">{children}</div>
    </section>
  );

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Category Setup" }, { label: "Sub-Sub-Categories" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={Folder} title="Sub-Sub-Categories" total={total} noun="sub-sub-categories" />}
        actions={noSubCategories ? undefined : add}
        loading={<ListSkeleton label="Loading sub-sub-categories" />}
        empty={card(emptyState)}
        error={{ title: "Couldn't load sub-sub-categories", description: "Something went wrong reaching the catalog. Check your connection and try again." }}
      >
        {card(
          total === 0 && !filtered ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <SubSubCategoriesTable items={items} offset={(page - 1) * pageSize} categories={categories} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                noun="sub-sub-categories"
                params={{
                  q: params.q || undefined,
                  status: params.status === "ALL" ? undefined : params.status,
                  category: params.category || undefined,
                  sub: params.sub || undefined,
                  pageSize: pageSize === 10 ? undefined : String(pageSize),
                }}
              />
            </>
          ) : (
            <NoMatches noun="sub-sub-categories" q={params.q} />
          ),
        )}
      </PreviewStateFrame>
    </>
  );
}
