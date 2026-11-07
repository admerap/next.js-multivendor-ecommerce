import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { reviewRef } from "@/lib/validations/admin-review";
import { reviewStatusOf, type VendorReviewListParams, type VendorReviewStatus } from "@/lib/validations/vendor-review";

export type VendorReviewRow = {
  id: string;
  ref: string;
  rating: number;
  title: string | null;
  comment: string;
  photoCount: number;
  status: VendorReviewStatus;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  product: { id: string; name: string; thumbnail: string | null };
  /** "Ana R." — the same short name the storefront shows */
  reviewer: string;
};

const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : (first ?? "Customer");
};

const STATUS_WHERE: Record<VendorReviewStatus, Prisma.ReviewWhereInput> = {
  published: { status: "APPROVED", isVisible: true },
  hidden: { status: "APPROVED", isVisible: false },
  pending: { status: "PENDING" },
  denied: { status: "REJECTED" },
};

/**
 * Vendor › Product Reviews: reviews on THIS store's products only (the store comes from the session; callers pass
 * it). Newest first; search by review ID, product, reviewer or text; status / rating / replied filters.
 */
export async function listVendorReviews(vendorId: string, params: VendorReviewListParams) {
  const { q } = params;
  const ref = /^#?(r-)?[a-z0-9]{6}$/i.test(q) ? q.replace(/^#?(r-)?/i, "").toLowerCase() : null;
  const where: Prisma.ReviewWhereInput = {
    product: { vendorId },
    ...(params.status !== "ALL" && STATUS_WHERE[params.status]),
    ...(params.rating !== "ALL" && { rating: Number(params.rating) }),
    ...(params.reply === "replied" && { reply: { not: null } }),
    ...(params.reply === "unreplied" && { reply: null }),
    ...(q && {
      OR: [
        ...(ref ? [{ id: { endsWith: ref } }] : []),
        { product: { name: { contains: q } } },
        { customer: { name: { contains: q } } },
        { comment: { contains: q } },
        { title: { contains: q } },
      ],
    }),
  };
  const [total, storeTotal] = await Promise.all([prisma.review.count({ where }), prisma.review.count({ where: { product: { vendorId } } })]);
  const pageSize = params.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const found = await prisma.review.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      images: true,
      status: true,
      isVisible: true,
      reply: true,
      repliedAt: true,
      createdAt: true,
      product: { select: { id: true, name: true, thumbnail: true } },
      customer: { select: { name: true } },
    },
  });
  const items: VendorReviewRow[] = found.map((r) => ({
    id: r.id,
    ref: reviewRef(r.id),
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    photoCount: Array.isArray(r.images) ? r.images.length : 0,
    status: reviewStatusOf(r),
    reply: r.reply,
    repliedAt: r.repliedAt,
    createdAt: r.createdAt,
    product: r.product,
    reviewer: shortName(r.customer.name),
  }));
  return { items, total, storeTotal, page, pageSize, pageCount };
}
