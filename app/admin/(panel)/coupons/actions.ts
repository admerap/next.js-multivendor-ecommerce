"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { couponStatus, type CouponStatus } from "@/lib/coupons";
import { forbiddenResult, isAdmin } from "@/lib/admin-auth";
import { couponStatusWhere, toDbDate } from "@/lib/coupons.server";
import { prisma } from "@/lib/db";
import { adminCouponDenySchema, adminCouponIdSchema, adminCouponListSchema, type AdminCouponView } from "@/lib/validations/admin-coupon";
import { todayIso, type CouponDiscountTypeValue, type CouponScopeValue, type CouponTypeValue } from "@/lib/validations/coupon";
import type { ApprovalStatus } from "@/lib/validations/product";
import type { FilterOption } from "@/lib/list-params";

export type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T; fieldErrors?: { reason?: string } };

export type AdminCouponRow = {
  id: string;
  code: string;
  title: string;
  type: CouponTypeValue;
  discountType: CouponDiscountTypeValue;
  /** cents (AMOUNT) or whole percent (PERCENTAGE) */
  discountValue: number;
  scope: CouponScopeValue;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  limitPerUser: number | null;
  usedCount: number;
  /** YYYY-MM-DD */
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  status: CouponStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  productsCount: number;
  vendor: { id: string; name: string };
};


const forbidden = <T>(): ActionResult<T> => forbiddenResult("coupons");
const NOT_FOUND = "This coupon no longer exists.";

const VIEW_WHERE: Record<AdminCouponView, Prisma.CouponWhereInput> = {
  pending: { approvalStatus: "PENDING" },
  approved: { approvalStatus: "APPROVED" },
  denied: { approvalStatus: "REJECTED" },
};

/** Every admin page (lists, details, sidebar counts) + the vendor's own list and details. */
function revalidateCoupons() {
  revalidatePath("/admin", "layout");
  revalidatePath("/vendor/coupons", "layout");
}

/** One page of a Coupon Manage list, filtered by search (title/code), vendor and derived status. */
export async function getAdminCoupons(
  input: unknown,
  view: AdminCouponView,
): Promise<ActionResult<{ items: AdminCouponRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, vendor, status, page, pageSize } = adminCouponListSchema.parse(input ?? {});
  const today = todayIso();

  const where: Prisma.CouponWhereInput = {
    ...VIEW_WHERE[view],
    ...(vendor && { vendorId: vendor }),
    ...(status !== "ALL" && couponStatusWhere(status, toDbDate(today))),
    ...(q && { OR: [{ title: { contains: q } }, { code: { contains: q } }] }),
  };

  try {
    const total = await prisma.coupon.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.coupon.findMany({
      where,
      // Review queue: oldest request first. Other lists: newest first.
      orderBy: view === "pending" ? [{ submittedAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
      skip: (current - 1) * pageSize,
      take: pageSize,
      include: { vendor: { select: { id: true, storeName: true } }, _count: { select: { products: true } } },
    });
    const items: AdminCouponRow[] = rows.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      type: c.type,
      discountType: c.discountType,
      discountValue: c.discountValue,
      scope: c.scope,
      minPurchase: c.minPurchase,
      maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit,
      limitPerUser: c.limitPerUser,
      usedCount: c.usedCount,
      startsAt: c.startsAt.toISOString().slice(0, 10),
      expiresAt: c.expiresAt.toISOString().slice(0, 10),
      isActive: c.isActive,
      status: couponStatus(c, today),
      approvalStatus: c.approvalStatus,
      rejectionReason: c.rejectionReason,
      productsCount: c._count.products,
      vendor: { id: c.vendor.id, name: c.vendor.storeName },
    }));
    return { success: true, data: { items, total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[admin coupons] list failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load coupons." };
  }
}

/** Vendor options for the list filter: only vendors that have coupons in this list (same shape as getAdminProductFilters). */
export async function getAdminCouponFilters(view: AdminCouponView): Promise<ActionResult<{ vendors: FilterOption[] }>> {
  if (!(await isAdmin())) return forbidden();
  try {
    const vendors = await prisma.vendor.findMany({ where: { coupons: { some: VIEW_WHERE[view] } }, orderBy: { storeName: "asc" }, select: { id: true, storeName: true } });
    return { success: true, data: { vendors: vendors.map((v) => ({ id: v.id, label: v.storeName })) } };
  } catch (error) {
    console.error("[admin coupons] filters failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load the filters." };
  }
}

/** Approve: the coupon can be redeemed (while the vendor keeps it on and within its dates). */
export async function approveCoupon(input: unknown): Promise<ActionResult<{ isActive: boolean }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminCouponIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;
  try {
    const c = await prisma.coupon.update({ where: { id }, data: { approvalStatus: "APPROVED", rejectionReason: null }, select: { isActive: true } });
    revalidateCoupons();
    return { success: true, data: c };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: NOT_FOUND };
    console.error("[admin coupons] approve failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't approve the coupon. Please try again." };
  }
}

/** Deny with a reason the vendor sees; the coupon stops applying at checkout. */
export async function denyCoupon(input: unknown): Promise<ActionResult> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminCouponDenySchema.safeParse(input);
  if (!parsed.success) {
    const reason = parsed.error.issues.find((i) => i.path[0] === "reason")?.message;
    return { success: false, error: reason ?? "Invalid request.", fieldErrors: reason ? { reason } : undefined };
  }
  const { id, reason } = parsed.data;
  try {
    await prisma.coupon.update({ where: { id }, data: { approvalStatus: "REJECTED", rejectionReason: reason } });
    revalidateCoupons();
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: NOT_FOUND };
    console.error("[admin coupons] deny failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't deny the coupon. Please try again." };
  }
}

/**
 * Deletes any store's coupon. A coupon that was already used is DEACTIVATED instead (same rule as
 * the vendor's delete), so order history that references it keeps making sense.
 */
export async function adminDeleteCoupon(input: unknown): Promise<ActionResult<{ deactivated: boolean }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminCouponIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id }, select: { usedCount: true } });
    if (!coupon) return { success: false, error: NOT_FOUND };
    if (coupon.usedCount > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      revalidateCoupons();
      return { success: true, data: { deactivated: true } };
    }
    // CouponProduct links go with it (onDelete: Cascade).
    await prisma.coupon.delete({ where: { id } });
    revalidateCoupons();
    return { success: true, data: { deactivated: false } };
  } catch (error) {
    console.error("[admin coupons] delete failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't delete the coupon. Please try again." };
  }
}
