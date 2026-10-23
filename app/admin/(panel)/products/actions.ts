"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { forbiddenResult, isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { deleteProductImage } from "@/lib/uploads";
import {
  adminProductDenySchema,
  adminProductFlagSchema,
  adminProductIdSchema,
  adminProductListSchema,
  type AdminProductView,
} from "@/lib/validations/admin-product";
import type { ApprovalStatus, ProductTypeValue } from "@/lib/validations/product";
import type { FilterOption } from "@/lib/list-params";

export type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

export type AdminProductRow = {
  id: string;
  name: string;
  sku: string;
  thumbnail: string | null;
  category: string;
  productType: ProductTypeValue;
  /** cents */
  price: number;
  /** Product.stock — already the total of its variations when it has any (kept in sync on save). */
  stock: number;
  variationsCount: number;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  /** Admin note to the vendor (denied products). */
  rejectionReason: string | null;
  /** ISO date it last entered review (created, resubmitted or sent back for re-review). */
  submittedAt: string;
  /** Whole days since it was submitted (computed on the server, at request time). */
  waitingDays: number;
  vendor: { id: string; name: string };
};


const forbidden = <T>(): ActionResult<T> => forbiddenResult("products");
const NOT_FOUND = "This product no longer exists.";

/** What each Product Manage list shows. Featured / Popular list every flagged product, whatever its review status. */
const VIEW_WHERE: Record<AdminProductView, Prisma.ProductWhereInput> = {
  pending: { approvalStatus: "PENDING" },
  approved: { approvalStatus: "APPROVED" },
  denied: { approvalStatus: "REJECTED" },
  featured: { isFeatured: true },
  popular: { isPopular: true },
};

/** Every admin page (lists, details, sidebar counts) + the vendor's own list and details. */
function revalidateLists() {
  revalidatePath("/admin", "layout");
  revalidatePath("/vendor/products", "layout");
}

/** One page of a Product Manage list, filtered by search, vendor, category and the vendor's active switch. */
export async function getAdminProducts(
  input: unknown,
  view: AdminProductView,
): Promise<ActionResult<{ items: AdminProductRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, vendor, category, status, page, pageSize } = adminProductListSchema.parse(input ?? {});

  const where: Prisma.ProductWhereInput = {
    ...VIEW_WHERE[view],
    ...(vendor && { vendorId: vendor }),
    ...(category && { categoryId: category }),
    ...(status !== "ALL" && { isActive: status === "ACTIVE" }),
    ...(q && { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }),
  };

  try {
    const total = await prisma.product.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.product.findMany({
      where,
      // Review queue: oldest request first. Other lists: newest first.
      orderBy: view === "pending" ? [{ submittedAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
      skip: (current - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        productType: true,
        price: true,
        stock: true,
        approvalStatus: true,
        isActive: true,
        isFeatured: true,
        isPopular: true,
        rejectionReason: true,
        submittedAt: true,
        category: { select: { name: true } },
        vendor: { select: { id: true, storeName: true } },
        _count: { select: { variations: true } },
      },
    });
    const now = Date.now();
    const items: AdminProductRow[] = rows.map(({ category, vendor, _count, submittedAt, ...p }) => ({
      ...p,
      category: category.name,
      vendor: { id: vendor.id, name: vendor.storeName },
      submittedAt: submittedAt.toISOString(),
      waitingDays: Math.max(0, Math.floor((now - submittedAt.getTime()) / 86_400_000)),
      variationsCount: _count.variations,
    }));
    return { success: true, data: { items, total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[admin products] list failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load products." };
  }
}

/** Vendor + category options for the list filters: only those that have products in this list. */
export async function getAdminProductFilters(view: AdminProductView): Promise<ActionResult<{ vendors: FilterOption[]; categories: FilterOption[] }>> {
  if (!(await isAdmin())) return forbidden();
  try {
    const where = VIEW_WHERE[view];
    const [vendors, categories] = await Promise.all([
      prisma.vendor.findMany({ where: { products: { some: where } }, orderBy: { storeName: "asc" }, select: { id: true, storeName: true } }),
      prisma.category.findMany({ where: { products: { some: where } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return {
      success: true,
      data: { vendors: vendors.map((v) => ({ id: v.id, label: v.storeName })), categories: categories.map((c) => ({ id: c.id, label: c.name })) },
    };
  } catch (error) {
    console.error("[admin products] filters failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't load the filters." };
  }
}

/** Approve: the product can go live (when the vendor has it active). Clears any earlier deny reason. */
export async function approveProduct(input: unknown): Promise<ActionResult<{ isActive: boolean }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminProductIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;

  try {
    const p = await prisma.product.update({ where: { id }, data: { approvalStatus: "APPROVED", rejectionReason: null }, select: { isActive: true } });
    revalidateLists();
    return { success: true, data: p };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: NOT_FOUND };
    console.error("[admin products] approve failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't approve the product. Please try again." };
  }
}

/** Deny with a reason the vendor sees. Featured / Popular flags are kept but have no effect until it is approved again. */
export async function denyProduct(input: unknown): Promise<ActionResult & { fieldErrors?: { reason?: string } }> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminProductDenySchema.safeParse(input);
  if (!parsed.success) {
    const reason = parsed.error.issues.find((i) => i.path[0] === "reason")?.message;
    return { success: false, error: reason ?? "Invalid request.", fieldErrors: reason ? { reason } : undefined };
  }
  const { id, reason } = parsed.data;

  try {
    await prisma.product.update({ where: { id }, data: { approvalStatus: "REJECTED", rejectionReason: reason } });
    revalidateLists();
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: NOT_FOUND };
    console.error("[admin products] deny failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't deny the product. Please try again." };
  }
}

/**
 * Featured / Popular checkbox. Only an APPROVED product can be flagged on; un-flagging always works
 * (a flagged product that goes back to pending or is denied must not get stuck with the flag).
 */
export async function setProductFlag(input: unknown): Promise<ActionResult<{ value: boolean }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminProductFlagSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id, flag, value } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id }, select: { approvalStatus: true } });
  if (!product) return { success: false, error: NOT_FOUND };
  if (value && product.approvalStatus !== "APPROVED") return { success: false, error: "Approve the product before featuring it." };

  try {
    await prisma.product.update({ where: { id }, data: { [flag]: value } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, error: NOT_FOUND };
    console.error("[admin products] flag failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't update the product. Please try again." };
  }
  revalidateLists();
  return { success: true, data: { value } };
}

/** Permanently deletes a product (any store), its variations, gallery rows and image files. */
export async function adminDeleteProduct(input: unknown): Promise<ActionResult> {
  if (!(await isAdmin())) return forbidden();
  const parsed = adminProductIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { id } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { thumbnail: true, images: { select: { url: true } }, variations: { select: { image: true } } },
  });
  if (!product) return { success: false, error: NOT_FOUND };

  try {
    // Variations, gallery rows and coupon links go with it (onDelete: Cascade).
    // TODO(orders): once orders exist, deactivate instead of deleting a product that has order items.
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    console.error("[admin products] delete failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't delete the product. Please try again." };
  }
  // Files only after the row is gone, so a failed delete never leaves a product without images.
  await Promise.all(
    [product.thumbnail, ...product.images.map((i) => i.url), ...product.variations.map((v) => v.image)].map((f) => deleteProductImage(f)),
  );
  revalidateLists();
  return { success: true };
}
