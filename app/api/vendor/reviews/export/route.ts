import { getVendorReviews } from "@/lib/actions/vendor-reviews";
import { prisma } from "@/lib/db";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { orderDate } from "@/lib/orders";
import { VENDOR_REVIEW_STATUS_LABEL } from "@/lib/validations/vendor-review";
import { currentVendorId } from "@/lib/vendor-auth";
import type { VendorReviewRow } from "@/lib/vendor-reviews.server";

/**
 * GET /api/vendor/reviews/export?format=xlsx|csv|pdf&q=&status=&rating=&reply= — Product Reviews › Export: every
 * review on the signed-in store's products matching the list's filters (the loader scopes to the store).
 */
export async function GET(req: Request) {
  const vendorId = await currentVendorId();
  if (!vendorId) return signInAgain(req, "/vendor/login", "/vendor/reviews");
  const sp = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const [rows, store] = await Promise.all([
    allPages((page) => getVendorReviews({ ...sp, page, pageSize: 50 })),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { storeName: true } }),
  ]);
  if (!rows) return signInAgain(req, "/vendor/login", "/vendor/reviews");
  return listExport<VendorReviewRow>(req, {
    name: "reviews",
    title: "Product Reviews",
    store: store?.storeName ?? "My store",
    subtitle: sp.q ? `Search: ${sp.q}` : "All reviews",
    columns: [
      { label: "Review ID", value: (r) => `#${r.ref}`, weight: 0.8 },
      { label: "Date", value: (r) => orderDate(r.createdAt), weight: 0.9 },
      { label: "Product", value: (r) => r.product.name, weight: 1.6 },
      { label: "Reviewer", value: (r) => r.reviewer, weight: 0.9 },
      { label: "Rating", value: (r) => r.rating, weight: 0.5, align: "right" },
      { label: "Review", value: (r) => [r.title, r.comment].filter(Boolean).join(" — "), weight: 2.4 },
      { label: "Reply", value: (r) => r.reply ?? "", weight: 1.8 },
      { label: "Status", value: (r) => VENDOR_REVIEW_STATUS_LABEL[r.status], weight: 0.8 },
    ],
    rows,
  });
}
