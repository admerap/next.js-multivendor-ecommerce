import { getCategories, type CategoryRow } from "@/app/admin/(panel)/categories/actions";
import { getSubSubCategories, type SubSubCategoryRow } from "@/app/admin/(panel)/categories/sub-sub/actions";
import { getSubCategories, type SubCategoryRow } from "@/app/admin/(panel)/categories/sub/actions";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";

const status = (s: string) => (s === "ACTIVE" ? "Active" : "Inactive");

/**
 * GET /api/admin/categories/export?level=category|sub|sub-sub&format=xlsx|csv|pdf&q=&status=&category=&sub= —
 * Category Setup › Export: every category, sub- or sub-sub-category matching the list's filters. Needs
 * Categories › Read (the list loaders check it).
 */
export async function GET(req: Request) {
  const { level, ...sp } = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const subtitle = [sp.q && `Search: ${sp.q}`, sp.status && `Status: ${status(sp.status)}`].filter(Boolean).join(" · ") || "All";
  const back = level === "sub" ? "/admin/categories/sub" : level === "sub-sub" ? "/admin/categories/sub-sub" : "/admin/categories";

  if (level === "sub-sub") {
    const rows = await allPages((page) => getSubSubCategories({ ...sp, page, pageSize: 50 }));
    if (!rows) return signInAgain(req, "/admin/login", back);
    return listExport<SubSubCategoryRow>(req, {
      name: "sub-sub-categories",
      title: "Sub-Sub-Categories",
      store: "Sundry HQ",
      subtitle,
      columns: [
        { label: "Sub-sub-category", value: (c) => c.name, weight: 1.8 },
        { label: "Sub-category", value: (c) => c.subCategoryName, weight: 1.6 },
        { label: "Category", value: (c) => c.categoryName, weight: 1.6 },
        { label: "Products", value: (c) => c.productsCount, weight: 0.8, align: "right" },
        { label: "Status", value: (c) => status(c.status), weight: 0.8 },
      ],
      rows,
    });
  }
  if (level === "sub") {
    const rows = await allPages((page) => getSubCategories({ ...sp, page, pageSize: 50 }));
    if (!rows) return signInAgain(req, "/admin/login", back);
    return listExport<SubCategoryRow>(req, {
      name: "sub-categories",
      title: "Sub-Categories",
      store: "Sundry HQ",
      subtitle,
      columns: [
        { label: "Sub-category", value: (c) => c.name, weight: 1.8 },
        { label: "Category", value: (c) => c.categoryName, weight: 1.6 },
        { label: "Sub-sub-categories", value: (c) => c.subSubCategoriesCount, weight: 1, align: "right" },
        { label: "Products", value: (c) => c.productsCount, weight: 0.8, align: "right" },
        { label: "Status", value: (c) => status(c.status), weight: 0.8 },
      ],
      rows,
    });
  }
  const rows = await allPages((page) => getCategories({ ...sp, page, pageSize: 50 }));
  if (!rows) return signInAgain(req, "/admin/login", back);
  return listExport<CategoryRow>(req, {
    name: "categories",
    title: "Categories",
    store: "Sundry HQ",
    subtitle,
    columns: [
      { label: "Category", value: (c) => c.name, weight: 1.8 },
      { label: "Slug", value: (c) => c.slug, weight: 1.6 },
      { label: "Sub-categories", value: (c) => c.subCategoriesCount, weight: 1, align: "right" },
      { label: "Products", value: (c) => c.productsCount, weight: 0.8, align: "right" },
      { label: "Status", value: (c) => status(c.status), weight: 0.8 },
    ],
    rows,
  });
}
