import { getBrands, type BrandRow } from "@/app/admin/(panel)/brands/actions";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";

/** GET /api/admin/brands/export?format=xlsx|csv|pdf&q=&status=&brand= — Brands › Export: every brand matching the list's filters. Needs Brands › Read (the list loader checks it). */
export async function GET(req: Request) {
  const sp = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await allPages((page) => getBrands({ ...sp, page, pageSize: 50 }));
  if (!rows) return signInAgain(req, "/admin/login", "/admin/brands");
  return listExport<BrandRow>(req, {
    name: "brands",
    title: "Brands",
    store: "Sundry HQ",
    subtitle: [sp.q && `Search: ${sp.q}`, sp.status && `Status: ${sp.status === "ACTIVE" ? "Active" : "Inactive"}`].filter(Boolean).join(" · ") || "All brands",
    columns: [
      { label: "Brand", value: (b) => b.name, weight: 2 },
      { label: "Slug", value: (b) => b.slug, weight: 1.6 },
      { label: "Products", value: (b) => b.productsCount, weight: 0.8, align: "right" },
      { label: "Status", value: (b) => (b.status === "ACTIVE" ? "Active" : "Inactive"), weight: 0.8 },
      { label: "Created", value: (b) => b.createdAt.slice(0, 10), weight: 1 },
    ],
    rows,
  });
}
