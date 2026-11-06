import { getAdminProducts, type AdminProductRow } from "@/app/admin/(panel)/products/actions";
import { productColumns } from "@/lib/catalog-export";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { adminProductViewSchema } from "@/lib/validations/admin-product";

const TITLE = {
  pending: "Pending Products",
  approved: "Approved Products",
  denied: "Denied Products",
  featured: "Featured Products",
  popular: "Popular Products",
};

/**
 * GET /api/admin/products/export?view=pending|approved|denied|featured|popular&format=xlsx|csv|pdf&q=&… — Product
 * Manage › Export: every product of that list matching its filters. Needs Products › Read (the loader checks it).
 */
export async function GET(req: Request) {
  const { view: rawView, ...sp } = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const view = adminProductViewSchema.catch("approved").parse(rawView);
  const rows = await allPages((page) => getAdminProducts({ ...sp, page, pageSize: 50 }, view));
  if (!rows) return signInAgain(req, "/admin/login", `/admin/products/${view}`);
  return listExport<AdminProductRow>(req, {
    name: `products-${view}`,
    title: TITLE[view],
    store: "Sundry HQ",
    subtitle: sp.q ? `Search: ${sp.q}` : "All products in this list",
    columns: [{ label: "Store", value: (p) => p.vendor.name, weight: 1.3 }, ...productColumns<AdminProductRow>()],
    rows,
  });
}
