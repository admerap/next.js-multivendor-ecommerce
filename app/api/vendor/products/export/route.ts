import { getVendorProducts, type ProductRow } from "@/app/vendor/(panel)/products/actions";
import { productColumns } from "@/lib/catalog-export";
import { prisma } from "@/lib/db";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { currentVendorId } from "@/lib/vendor-auth";

/** GET /api/vendor/products/export?format=xlsx|csv|pdf&q=&status= — Product List › Export: every product of the signed-in store matching the list's filters (the loader scopes to the store). */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return signInAgain(req, "/vendor/login", "/vendor/products");
  const sp = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const [rows, store] = await Promise.all([
    allPages((page) => getVendorProducts({ ...sp, page, pageSize: 50 })),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { storeName: true } }),
  ]);
  if (!rows) return signInAgain(req, "/vendor/login", "/vendor/products");
  return listExport<ProductRow>(req, {
    name: "products",
    title: "Product List",
    store: store?.storeName ?? "My store",
    subtitle: sp.q ? `Search: ${sp.q}` : "All products",
    columns: productColumns<ProductRow>(),
    rows,
  });
}
