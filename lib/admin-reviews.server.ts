import "server-only";

import type { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { REVIEW_STATUS_SLUGS, type AdminReviewListParams } from "@/lib/validations/admin-review";

/**
 * Admin › Review Manage — every product review on the platform (all stores, all customers). Callers
 * must have checked the ADMIN role first. Moderation: status (PENDING → APPROVED / REJECTED) is the
 * decision; isVisible shows / hides an approved review. The storefront shows APPROVED AND isVisible.
 */

export type AdminReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  photoCount: number;
  status: ReviewStatus;
  isVisible: boolean;
  createdAt: Date;
  product: { id: string; name: string; thumbnail: string | null };
  store: { id: string; name: string };
  customer: { id: string; name: string };
  orderNumber: number;
};

export type AdminReviewList = {
  rows: AdminReviewRow[];
  /** reviews per status with the search / panel filters applied (the status tabs) */
  counts: Record<ReviewStatus, number>;
  /** reviews on the platform, no filters (0 → "No reviews yet") */
  platformTotal: number;
  /** stores that have reviews (Filter › Store) */
  storeOptions: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const ROW_SELECT = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  images: true,
  status: true,
  isVisible: true,
  createdAt: true,
  product: { select: { id: true, name: true, thumbnail: true, vendor: { select: { id: true, storeName: true } } } },
  customer: { select: { id: true, name: true } },
  orderItem: { select: { storeOrder: { select: { order: { select: { orderNumber: true } } } } } },
} satisfies Prisma.ReviewSelect;

const photosOf = (images: Prisma.JsonValue) => (Array.isArray(images) ? images.filter((x): x is string => typeof x === "string") : []);

const toRow = (r: Prisma.ReviewGetPayload<{ select: typeof ROW_SELECT }>): AdminReviewRow => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  comment: r.comment,
  photoCount: photosOf(r.images).length,
  status: r.status,
  isVisible: r.isVisible,
  createdAt: r.createdAt,
  product: { id: r.product.id, name: r.product.name, thumbnail: r.product.thumbnail },
  store: { id: r.product.vendor.id, name: r.product.vendor.storeName },
  customer: { id: r.customer.id, name: r.customer.name },
  orderNumber: r.orderItem.storeOrder.order.orderNumber,
});

/**
 * One review in full for the admin: the text and photos, the product (with its current stars and
 * approval / visibility on the storefront), the customer, and the purchased line it's tied to — the
 * order and its delivery, which prove a verified purchase. Unknown id → null.
 */
export async function getAdminReview(id: string) {
  const r = await prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      images: true,
      status: true,
      isVisible: true,
      createdAt: true,
      moderatedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          thumbnail: true,
          ratingAvg: true,
          reviewCount: true,
          approvalStatus: true,
          isActive: true,
          vendor: { select: { id: true, storeName: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      orderItem: {
        select: {
          productName: true,
          variationName: true,
          qty: true,
          unitPrice: true,
          storeOrder: {
            select: {
              status: true,
              events: { where: { status: "DELIVERED" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
              order: { select: { orderNumber: true, createdAt: true } },
            },
          },
        },
      },
    },
  });
  if (!r) return null;
  const so = r.orderItem.storeOrder;
  return {
    ...r,
    photos: photosOf(r.images),
    purchase: {
      orderNumber: so.order.orderNumber,
      orderedAt: so.order.createdAt,
      deliveredAt: so.events[0]?.createdAt ?? null,
      status: so.status,
      productName: r.orderItem.productName,
      variationName: r.orderItem.variationName,
      qty: r.orderItem.qty,
      unitPrice: r.orderItem.unitPrice,
    },
  };
}
export type AdminReview = NonNullable<Awaited<ReturnType<typeof getAdminReview>>>;

/** The review list. Pending first is the queue order an admin needs; then newest. `all` → one page (export). */
export async function listAdminReviews(params: AdminReviewListParams, { all = false }: { all?: boolean } = {}): Promise<AdminReviewList> {
  const { q, rating, store, visibility } = params;
  // "#R-4K2X9Q" / "R-4K2X9Q" / "4k2x9q" → the id's tail
  const ref = /^#?(r-)?[a-z0-9]{6}$/i.test(q) ? q.replace(/^#?(r-)?/i, "").toLowerCase() : null;
  const filters: Prisma.ReviewWhereInput = {
    ...(rating && { rating }),
    ...(store && { product: { vendorId: store } }),
    ...(visibility && { isVisible: visibility === "visible" }),
    ...(q && {
      OR: [
        ...(ref ? [{ id: { endsWith: ref } }] : []),
        { product: { name: { contains: q } } },
        { customer: { name: { contains: q } } },
        { customer: { email: { contains: q } } },
        { comment: { contains: q } },
      ],
    }),
  };
  const where: Prisma.ReviewWhereInput = { ...filters, ...(params.status && { status: REVIEW_STATUS_SLUGS[params.status] }) };

  const [byStatus, platformTotal, storeRows, total] = await Promise.all([
    prisma.review.groupBy({ by: ["status"], where: filters, _count: { _all: true } }),
    prisma.review.count(),
    prisma.vendor.findMany({ where: { products: { some: { reviews: { some: {} } } } }, select: { id: true, storeName: true }, orderBy: { storeName: "asc" } }),
    prisma.review.count({ where }),
  ]);
  const pageSize = all ? Math.max(1, total) : params.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const found = await prisma.review.findMany({
    where,
    // MySQL sorts an ENUM by its declared order (PENDING, APPROVED, REJECTED): the moderation queue first.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: ROW_SELECT,
  });

  const counts: Record<ReviewStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const r of byStatus) counts[r.status] = r._count._all;
  return {
    rows: found.map(toRow),
    counts,
    platformTotal,
    storeOptions: storeRows.map((s) => ({ id: s.id, name: s.storeName })),
    total,
    page,
    pageSize,
    pageCount,
  };
}
