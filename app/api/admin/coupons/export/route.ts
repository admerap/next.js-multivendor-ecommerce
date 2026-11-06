import { getAdminCoupons, type AdminCouponRow } from "@/app/admin/(panel)/coupons/actions";
import { couponColumns } from "@/lib/catalog-export";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { adminCouponViewSchema } from "@/lib/validations/admin-coupon";

const TITLE = { pending: "Pending Coupons", approved: "Approved Coupons", denied: "Denied Coupons" };

/**
 * GET /api/admin/coupons/export?view=pending|approved|denied&format=xlsx|csv|pdf&q=&… — Coupon Manage › Export:
 * every coupon of that list matching its filters. Needs Coupons › Read (the loader checks it).
 */
export async function GET(req: Request) {
  const { view: rawView, ...sp } = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const view = adminCouponViewSchema.catch("approved").parse(rawView);
  const rows = await allPages((page) => getAdminCoupons({ ...sp, page, pageSize: 50 }, view));
  if (!rows) return signInAgain(req, "/admin/login", `/admin/coupons/${view}`);
  return listExport<AdminCouponRow>(req, {
    name: `coupons-${view}`,
    title: TITLE[view],
    store: "Sundry HQ",
    subtitle: sp.q ? `Search: ${sp.q}` : "All coupons in this list",
    columns: [{ label: "Store", value: (c) => c.vendor.name, weight: 1.3 }, ...couponColumns<AdminCouponRow>()],
    rows,
  });
}
