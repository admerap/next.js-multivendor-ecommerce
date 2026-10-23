import { z } from "zod";

/** The five admin Product Manage lists (routes /admin/products/<view>). */
const ADMIN_PRODUCT_VIEWS = ["pending", "approved", "denied", "featured", "popular"] as const;
export type AdminProductView = (typeof ADMIN_PRODUCT_VIEWS)[number];

const id = z.string().trim().min(1).max(40);

/** URL search params of the admin product lists. Anything unknown falls back to the default. */
export const adminProductListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  /** Vendor id */
  vendor: z.string().trim().max(40).catch(""),
  /** Category id */
  category: z.string().trim().max(40).catch(""),
  /** The vendor's own show/hide switch (isActive). */
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(50)])).catch(10),
});

export const adminProductIdSchema = z.object({ id });

/** Featured / Popular checkbox (merchandising flags; only approved products can carry them). */
export const adminProductFlagSchema = z.object({ id, flag: z.enum(["isFeatured", "isPopular"]), value: z.boolean() });

export const DENY_REASON_MAX = 300;
/** One-tap reasons from the adminproductdetail design; the admin can edit the text before sending. */
export const DENY_REASON_PRESETS = ["Photos don't match", "Missing size chart", "Price looks incorrect", "Restricted item"] as const;

/** Deny requires a reason the vendor sees on their product (PRD FR-D5). */
export const adminProductDenySchema = z.object({
  id,
  reason: z
    .string()
    .trim()
    .min(3, "Tell the vendor why (at least 3 characters).")
    .max(DENY_REASON_MAX, `Keep the reason under ${DENY_REASON_MAX} characters.`),
});
