import { getVendorCoupons, type CouponRow } from "@/app/vendor/(panel)/coupons/actions";
import { couponColumns } from "@/lib/catalog-export";
import { prisma } from "@/lib/db";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { currentVendorId } from "@/lib/vendor-auth";

/** GET /api/vendor/coupons/export?format=xlsx|csv|pdf&q=&status=&approval= — Coupons › Export: every coupon of the signed-in store matching the list's filters (the loader scopes to the store). */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return signInAgain(req, "/vendor/login", "/vendor/coupons");
  const sp = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const [rows, store] = await Promise.all([
    allPages((page) => getVendorCoupons({ ...sp, page, pageSize: 50 })),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { storeName: true } }),
  ]);
  if (!rows) return signInAgain(req, "/vendor/login", "/vendor/coupons");
  return listExport<CouponRow>(req, {
    name: "coupons",
    title: "Coupons",
    store: store?.storeName ?? "My store",
    subtitle: sp.q ? `Search: ${sp.q}` : "All coupons",
    columns: [...couponColumns<CouponRow>(), { label: "Products", value: (c) => (c.products.length ? c.products.join(", ") : "Entire store"), weight: 1.6 }],
    rows,
  });
}
