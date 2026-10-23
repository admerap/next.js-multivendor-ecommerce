import "server-only";

import { couponStatus } from "@/lib/coupons";
import { prisma } from "@/lib/db";
import { todayIso } from "@/lib/validations/coupon";

/** Any store's coupon for the admin details page (the caller must have checked the ADMIN role); null = 404. */
export async function getAdminCouponDetail(id: string) {
  const c = await prisma.coupon.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, storeName: true, logo: true, _count: { select: { coupons: true } } } },
      products: {
        orderBy: { product: { name: "asc" } },
        select: { product: { select: { id: true, name: true, sku: true, thumbnail: true, approvalStatus: true, vendorId: true } } },
      },
    },
  });
  if (!c) return null;
  return {
    ...c,
    status: couponStatus(c, todayIso()),
    // Defensive: a coupon only ever points at its own store's products.
    products: c.products.map((l) => l.product).filter((p) => p.vendorId === c.vendorId),
  };
}

export type AdminCouponDetail = NonNullable<Awaited<ReturnType<typeof getAdminCouponDetail>>>;
