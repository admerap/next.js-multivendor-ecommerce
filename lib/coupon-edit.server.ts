import "server-only";

import type { CouponProductOption } from "@/app/vendor/(panel)/coupons/actions";
import type { CouponFormValues } from "@/components/vendor/coupons/CouponForm";
import { prisma } from "@/lib/db";
import { centsToInput, type ApprovalStatus } from "@/lib/validations/product";

/** One of THIS vendor's coupons, shaped for the edit form; null (→ 404) for unknown or other vendors' ids. */
export async function getCouponForEdit(id: string, vendorId: string): Promise<{
  id: string;
  values: CouponFormValues;
  products: CouponProductOption[];
  usedCount: number;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
} | null> {
  const c = await prisma.coupon.findFirst({
    where: { id, vendorId },
    include: { products: { include: { product: { select: { id: true, name: true, sku: true, thumbnail: true, approvalStatus: true, vendorId: true } } } } },
  });
  if (!c) return null;
  const free = c.type === "FREE_DELIVERY";
  return {
    id: c.id,
    usedCount: c.usedCount,
    approvalStatus: c.approvalStatus,
    rejectionReason: c.rejectionReason,
    values: {
      type: c.type,
      title: c.title,
      code: c.code,
      limitPerUser: c.limitPerUser?.toString() ?? "",
      usageLimit: c.usageLimit?.toString() ?? "",
      discountType: c.discountType,
      discountValue: free ? "" : c.discountType === "PERCENTAGE" ? String(c.discountValue) : centsToInput(c.discountValue),
      minPurchase: c.minPurchase ? centsToInput(c.minPurchase) : "",
      maxDiscount: c.maxDiscount != null ? centsToInput(c.maxDiscount) : "",
      startsAt: c.startsAt.toISOString().slice(0, 10),
      expiresAt: c.expiresAt.toISOString().slice(0, 10),
      scope: c.scope,
      isActive: c.isActive,
    },
    // Defensive: only ever hand back this vendor's products.
    products: c.products
      .filter((l) => l.product.vendorId === vendorId)
      .map(({ product: p }) => ({ id: p.id, name: p.name, sku: p.sku, thumbnail: p.thumbnail, approvalStatus: p.approvalStatus })),
  };
}
