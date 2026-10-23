"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { couponStatusWhere, toDbDate } from "@/lib/coupons.server";
import { prisma } from "@/lib/db";
import { currentVendorId } from "@/lib/vendor-auth";
import { couponStatus, dayOf, type CouponStatus } from "@/lib/coupons";
import {
  couponActiveSchema,
  couponFormSchema,
  couponIdSchema,
  couponListSchema,
  todayIso,
  type CouponDiscountTypeValue,
  type CouponScopeValue,
  type CouponTypeValue,
} from "@/lib/validations/coupon";
import type { ApprovalStatus } from "@/lib/validations/product";
import { fieldErrorsOf } from "@/lib/form-errors";

export type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T; fieldErrors?: Record<string, string> };
export type CouponProductOption = { id: string; name: string; sku: string; thumbnail: string | null; approvalStatus: ApprovalStatus };

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const FIX_FIELDS = "Please fix the highlighted fields";

/**
 * Product picker for SPECIFIC_PRODUCTS coupons: ONLY the signed-in vendor's products (vendorId from
 * the session), matched by name or SKU, newest first, 50 at a time.
 */
export async function searchCouponProducts(query: unknown): Promise<ActionResult<CouponProductOption[]>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const q = z.string().trim().max(100).catch("").parse(query);
  try {
    const data = await prisma.product.findMany({
      where: { vendorId, ...(q && { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, name: true, sku: true, thumbnail: true, approvalStatus: true },
    });
    return { success: true, data };
  } catch (error) {
    console.error("[vendor coupons] product search failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load your products. Please try again." };
  }
}

/**
 * Creates a coupon for the signed-in vendor. Everything is validated on the server: value ranges,
 * dates, per-vendor code uniqueness, and that every attached product belongs to THIS vendor.
 */
export async function createCoupon(input: unknown): Promise<ActionResult<{ id: string }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };

  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error.issues);
    return { success: false, error: Object.values(fieldErrors)[0] ?? FIX_FIELDS, fieldErrors };
  }
  const d = parsed.data;
  if (d.expiresAt < todayIso()) {
    const message = "Expire date has already passed — choose today or a later date";
    return { success: false, error: message, fieldErrors: { expiresAt: message } };
  }

  try {
    // The core rule starts here: a coupon may only point at this vendor's own products.
    if (d.productIds.length) {
      const owned = await prisma.product.count({ where: { id: { in: d.productIds }, vendorId } });
      if (owned !== d.productIds.length) {
        const message = "Some selected products aren't in your store. Please choose again.";
        return { success: false, error: message, fieldErrors: { productIds: message } };
      }
    }
    if (await prisma.coupon.findUnique({ where: { vendorId_code: { vendorId, code: d.code } }, select: { id: true } })) {
      const message = "You already have a coupon with this code — generate a new one";
      return { success: false, error: message, fieldErrors: { code: message } };
    }

    const coupon = await prisma.coupon.create({
      data: {
        vendorId,
        code: d.code,
        title: d.title,
        type: d.type,
        discountType: d.discountType,
        discountValue: d.discountValue,
        scope: d.scope,
        minPurchase: d.minPurchase,
        maxDiscount: d.maxDiscount,
        usageLimit: d.usageLimit,
        limitPerUser: d.limitPerUser,
        startsAt: toDbDate(d.startsAt),
        expiresAt: toDbDate(d.expiresAt),
        isActive: d.isActive,
        products: { create: d.productIds.map((productId) => ({ productId })) },
      },
      select: { id: true },
    });
    revalidatePath("/vendor/coupons");
    revalidatePath("/admin", "layout"); // new coupons start PENDING: admin badge + lists
    return { success: true, data: coupon };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const message = "You already have a coupon with this code — generate a new one";
      return { success: false, error: message, fieldErrors: { code: message } };
    }
    console.error("[vendor coupons] create failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't save the coupon. Please try again." };
  }
}

// ── Coupon List ──────────────────────────────────────────────────────────────

export type CouponRow = {
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
  /** Admin review (only APPROVED coupons apply at checkout). */
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  /** names of the attached products (SPECIFIC_PRODUCTS) */
  products: string[];
};

const NOT_FOUND = "This coupon no longer exists.";

/** This vendor's coupons only (vendorId from the session): search, status filter, server pagination. */
export async function getVendorCoupons(input: unknown): Promise<
  ActionResult<{ items: CouponRow[]; total: number; page: number; pageSize: number; pageCount: number }>
> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const { q, status, approval, page, pageSize } = couponListSchema.parse(input ?? {});
  const today = todayIso();

  const where: Prisma.CouponWhereInput = {
    vendorId,
    ...(status !== "ALL" && couponStatusWhere(status, toDbDate(today))),
    ...(approval !== "ALL" && { approvalStatus: approval }),
    ...(q && { OR: [{ title: { contains: q } }, { code: { contains: q } }] }),
  };

  try {
    const total = await prisma.coupon.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.coupon.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (current - 1) * pageSize,
      take: pageSize,
      include: { products: { select: { product: { select: { name: true } } }, take: 50 } },
    });
    const items: CouponRow[] = rows.map((c) => ({
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
      products: c.products.map((p) => p.product.name),
    }));
    return { success: true, data: { items, total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[vendor coupons] list failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load your coupons." };
  }
}

/** The vendor's on/off switch (Status column). Scoped: another vendor's id matches nothing. */
export async function setCouponActive(input: unknown): Promise<ActionResult<{ isActive: boolean; status: CouponStatus }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const parsed = couponActiveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id, isActive } = parsed.data;
  try {
    const { count } = await prisma.coupon.updateMany({ where: { id, vendorId }, data: { isActive } });
    if (count === 0) return { success: false, error: NOT_FOUND };
    const c = await prisma.coupon.findUniqueOrThrow({ where: { id }, select: { isActive: true, startsAt: true, expiresAt: true } });
    revalidatePath("/vendor/coupons");
    return { success: true, data: { isActive: c.isActive, status: couponStatus(c, todayIso()) } };
  } catch (error) {
    console.error("[vendor coupons] toggle failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't update the coupon. Please try again." };
  }
}

/**
 * Deletes one of this vendor's coupons. A coupon that was already used is DEACTIVATED instead,
 * so order history that references it keeps making sense.
 */
export async function deleteCoupon(input: unknown): Promise<ActionResult<{ deactivated: boolean }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const parsed = couponIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;
  try {
    const coupon = await prisma.coupon.findFirst({ where: { id, vendorId }, select: { usedCount: true } });
    if (!coupon) return { success: false, error: NOT_FOUND };
    if (coupon.usedCount > 0) {
      await prisma.coupon.updateMany({ where: { id, vendorId }, data: { isActive: false } });
      revalidatePath("/vendor/coupons");
      return { success: true, data: { deactivated: true } };
    }
    // CouponProduct links go with it (onDelete: Cascade).
    await prisma.coupon.deleteMany({ where: { id, vendorId } });
    revalidatePath("/vendor/coupons");
    return { success: true, data: { deactivated: false } };
  } catch (error) {
    console.error("[vendor coupons] delete failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't delete the coupon. Please try again." };
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────

/**
 * Updates one of this vendor's coupons (another vendor's id is "not found"). Attached products are
 * diffed in one transaction: removed links deleted, new ones added — and every new product must be
 * this vendor's. usedCount is never touched here.
 * Re-review: an APPROVED coupon goes back to PENDING when what it gives changes (code, type, value,
 * min/max, dates, scope or products); title, usage limits and the on/off switch don't. A DENIED
 * coupon goes back to PENDING on any save (the vendor is resubmitting it).
 */
export async function updateCoupon(input: unknown): Promise<ActionResult<{ id: string; needsReview: boolean }>> {
  const vendorId = await currentVendorId();
  if (!vendorId) return { success: false, error: SESSION_EXPIRED };
  const idParsed = couponIdSchema.safeParse({ id: (input as { id?: unknown } | null)?.id });
  if (!idParsed.success) return { success: false, error: NOT_FOUND };
  const { id } = idParsed.data;

  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error.issues);
    return { success: false, error: Object.values(fieldErrors)[0] ?? FIX_FIELDS, fieldErrors };
  }
  const d = parsed.data;

  try {
    const current = await prisma.coupon.findFirst({ where: { id, vendorId }, include: { products: { select: { productId: true } } } });
    if (!current) return { success: false, error: NOT_FOUND };

    // A past expiry is only refused when it's being changed (old expired coupons stay editable).
    if (d.expiresAt < todayIso() && d.expiresAt !== current.expiresAt.toISOString().slice(0, 10)) {
      const message = "Expire date has already passed — choose today or a later date";
      return { success: false, error: message, fieldErrors: { expiresAt: message } };
    }
    if (d.productIds.length) {
      const owned = await prisma.product.count({ where: { id: { in: d.productIds }, vendorId } });
      if (owned !== d.productIds.length) {
        const message = "Some selected products aren't in your store. Please choose again.";
        return { success: false, error: message, fieldErrors: { productIds: message } };
      }
    }
    if (await prisma.coupon.findFirst({ where: { vendorId, code: d.code, NOT: { id } }, select: { id: true } })) {
      const message = "You already have a coupon with this code — generate a new one";
      return { success: false, error: message, fieldErrors: { code: message } };
    }

    const before = new Set(current.products.map((p) => p.productId));
    const after = new Set(d.productIds);
    const productsChanged = before.size !== after.size || [...after].some((p) => !before.has(p));
    const termsChanged =
      productsChanged ||
      current.code !== d.code ||
      current.type !== d.type ||
      current.discountType !== d.discountType ||
      current.discountValue !== d.discountValue ||
      current.minPurchase !== d.minPurchase ||
      current.maxDiscount !== d.maxDiscount ||
      current.scope !== d.scope ||
      dayOf(current.startsAt) !== d.startsAt ||
      dayOf(current.expiresAt) !== d.expiresAt;
    const needsReview = current.approvalStatus === "REJECTED" || (current.approvalStatus === "APPROVED" && termsChanged);
    await prisma.$transaction([
      prisma.coupon.update({
        where: { id },
        data: {
          code: d.code,
          title: d.title,
          type: d.type,
          discountType: d.discountType,
          discountValue: d.discountValue,
          scope: d.scope,
          minPurchase: d.minPurchase,
          maxDiscount: d.maxDiscount,
          usageLimit: d.usageLimit,
          limitPerUser: d.limitPerUser,
          startsAt: toDbDate(d.startsAt),
          expiresAt: toDbDate(d.expiresAt),
          isActive: d.isActive,
          // Back in the admin queue (queues from now). The deny reason stays visible to the admin as
          // "previous reason" until it is approved.
          ...(needsReview && { approvalStatus: "PENDING" as const, submittedAt: new Date() }),
        },
      }),
      prisma.couponProduct.deleteMany({ where: { couponId: id, productId: { notIn: [...after] } } }),
      prisma.couponProduct.createMany({ data: [...after].filter((p) => !before.has(p)).map((productId) => ({ couponId: id, productId })) }),
    ]);
    revalidatePath("/vendor/coupons");
    if (needsReview) revalidatePath("/admin", "layout"); // admin pending badge + lists
    return { success: true, data: { id, needsReview } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const message = "You already have a coupon with this code — generate a new one";
      return { success: false, error: message, fieldErrors: { code: message } };
    }
    console.error("[vendor coupons] update failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't save the coupon. Please try again." };
  }
}
