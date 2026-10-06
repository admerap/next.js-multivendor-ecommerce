"use server";

import { Prisma, type VendorStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { nextFreeSlug, slugify } from "@/lib/slug";
import { deleteVendorDocument, deleteVendorImage, saveVendorDocument, saveVendorImage, UploadError } from "@/lib/uploads";
import {
  VENDOR_TRANSITIONS,
  vendorCreateSchema,
  vendorIdSchema,
  vendorListSchema,
  vendorStatusActionSchema,
} from "@/lib/validations/admin-vendor";

export type ActionResult<T = undefined> = { success: boolean; error?: string; fieldErrors?: Record<string, string>; data?: T };

export type VendorRow = {
  id: string;
  storeName: string;
  logo: string | null;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  status: VendorStatus;
  productsCount: number;
  ordersCount: number;
  createdAt: string;
};

export type VendorDetail = VendorRow & {
  storePhone: string;
  storeAddress: string;
  ownerPhone: string | null;
  vendorImage: string | null;
  coverImage: string | null;
  tinNumber: string | null;
  tinExpiresAt: string | null;
  /** The certificate itself is private; only whether one is on file is exposed. */
  hasTinCertificate: boolean;
  /** Products currently live on the storefront (approved + active). */
  activeProductsCount: number;
  updatedAt: string;
  // Extension point: per-vendor analytics (orders, revenue, ratings…) are added here later.
};

/** Every action re-checks the role on the server; the page guard is not a security boundary. */
async function isAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN";
}
const forbidden = <T>(): ActionResult<T> => ({ success: false, error: "You don't have permission to manage vendors." });

/** Only real vendor accounts: the linked user must have the VENDOR role. */
const VENDOR_ACCOUNT: Prisma.VendorWhereInput = { user: { role: "VENDOR" } };

const ROW_SELECT = {
  id: true,
  storeName: true,
  slug: true,
  logo: true,
  phone: true,
  status: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
} satisfies Prisma.VendorSelect;

/**
 * Products per vendor. TODO(catalog): replace with `_count: { select: { products: true } }` once the
 * Product model (with vendorId/storeId) exists. Computed, never stored — 0 until then.
 */
async function productCounts(vendorIds: string[]): Promise<Map<string, number>> {
  return new Map(vendorIds.map((id) => [id, 0]));
}

/**
 * Active products of one vendor. TODO(catalog): `prisma.product.count({ where: { vendorId, status:
 * "APPROVED", isActive: true } })` once the Product model exists. 0 until then.
 */
async function activeProductCount(vendorId: string): Promise<number> {
  void vendorId;
  return 0;
}

function toRow(v: Prisma.VendorGetPayload<{ select: typeof ROW_SELECT }>, productsCount: number): VendorRow {
  return {
    id: v.id,
    storeName: v.storeName,
    logo: v.logo,
    slug: v.slug,
    ownerName: v.user.name,
    email: v.user.email,
    phone: v.phone,
    status: v.status,
    productsCount,
    ordersCount: 0, // TODO(orders): count StoreOrders once the Order models exist
    createdAt: v.createdAt.toISOString(),
  };
}

function revalidateVendorPages(id?: string) {
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/vendors/approval");
  if (id) revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/admin", "layout"); // sidebar pending badge + setup guide
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated vendor list with search (store name, owner name, email).
 * `onlyStatus` pins the status (Vendor Approval = PENDING) and ignores the status param.
 */
export async function getVendors(
  params: unknown,
  onlyStatus?: VendorStatus,
): Promise<ActionResult<{ items: VendorRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, status, sort, page, pageSize } = vendorListSchema.parse(params ?? {});
  const statusFilter = onlyStatus ?? (status === "ALL" ? undefined : status);

  const where: Prisma.VendorWhereInput = {
    ...VENDOR_ACCOUNT,
    ...(statusFilter && { status: statusFilter }),
    ...(q && { OR: [{ storeName: { contains: q } }, { user: { name: { contains: q } } }, { user: { email: { contains: q } } }] }),
  };

  try {
    const total = await prisma.vendor.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const rows = await prisma.vendor.findMany({
      where,
      // Approval queue: oldest application first. Vendor List: the chosen sort.
      orderBy:
        onlyStatus === "PENDING"
          ? { createdAt: "asc" }
          : sort === "name"
            ? { storeName: "asc" }
            : { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip: (current - 1) * pageSize,
      take: pageSize,
      select: ROW_SELECT,
    });
    const counts = await productCounts(rows.map((r) => r.id));
    return { success: true, data: { items: rows.map((r) => toRow(r, counts.get(r.id) ?? 0)), total, page: current, pageSize, pageCount } };
  } catch (error) {
    console.error("[vendors] list failed", error);
    return { success: false, error: "We couldn't load vendors. Please try again." };
  }
}

export async function getVendor(id: unknown): Promise<ActionResult<VendorDetail | null>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = vendorIdSchema.safeParse({ id });
  if (!parsed.success) return { success: true, data: null };

  try {
    const v = await prisma.vendor.findFirst({
      where: { id: parsed.data.id, ...VENDOR_ACCOUNT },
      select: {
        ...ROW_SELECT,
        phone: true,
        storeAddress: true,
        updatedAt: true,
        vendorImage: true,
        coverImage: true,
        tinNumber: true,
        tinExpiresAt: true,
        tinCertificate: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });
    if (!v) return { success: true, data: null };
    const productsCount = (await productCounts([v.id])).get(v.id) ?? 0;
    const activeProductsCount = await activeProductCount(v.id);
    return {
      success: true,
      data: {
        ...toRow(v, productsCount),
        storePhone: v.phone,
        storeAddress: v.storeAddress,
        ownerPhone: v.user.phone,
        vendorImage: v.vendorImage,
        coverImage: v.coverImage,
        tinNumber: v.tinNumber,
        tinExpiresAt: v.tinExpiresAt ? v.tinExpiresAt.toISOString().slice(0, 10) : null,
        hasTinCertificate: !!v.tinCertificate,
        activeProductsCount,
        updatedAt: v.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[vendors] get failed", error);
    return { success: false, error: "We couldn't load this vendor. Please try again." };
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Approve (PENDING/SUSPENDED → APPROVED) or suspend (PENDING/APPROVED → SUSPENDED). */
export async function changeVendorStatus(input: unknown): Promise<ActionResult<{ status: VendorStatus }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = vendorStatusActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid status change." };
  const { id, action } = parsed.data;
  const { from, to } = VENDOR_TRANSITIONS[action];

  try {
    // Conditional update: only moves from an allowed status, so two admins can't race into a bad state.
    const { count } = await prisma.vendor.updateMany({ where: { id, ...VENDOR_ACCOUNT, status: { in: from } }, data: { status: to } });
    if (count === 0) {
      const current = await prisma.vendor.findFirst({ where: { id, ...VENDOR_ACCOUNT }, select: { status: true } });
      if (!current) return { success: false, error: "This vendor no longer exists." };
      return { success: false, error: `This vendor is already ${current.status.toLowerCase()}. Refresh to see the latest status.` };
    }
    revalidateVendorPages(id);
    return { success: true, data: { status: to } };
  } catch (error) {
    console.error("[vendors] status change failed", error);
    return { success: false, error: "We couldn't update the vendor. Please try again." };
  }
}

const DUPLICATE_EMAIL = "An account with this email already exists";
const FILE_FIELDS = ["vendorImage", "logo", "coverImage", "tinCertificate"] as const;

function invalid<T>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  const n = Object.keys(fieldErrors).length;
  return { success: false, error: `${n} ${n === 1 ? "field needs" : "fields need"} your attention`, fieldErrors };
}

/**
 * Admin creates a vendor directly: User(role VENDOR, bcrypt hash) + Vendor(status APPROVED) in ONE
 * transaction — admin-created stores are pre-approved. The admin sets a temporary password and shares
 * it with the vendor (interim; email invites come later).
 */
export async function createVendor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = vendorCreateSchema.safeParse({
    ...Object.fromEntries(
      ["firstName", "lastName", "countryCode", "phone", "email", "password", "confirmPassword", "shopName", "shopAddress", "tinNumber", "tinExpiresAt"].map((k) => [k, formData.get(k) ?? undefined]),
    ),
    ...Object.fromEntries(FILE_FIELDS.map((k) => [k, formData.get(k) ?? undefined])),
  });
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  if (await prisma.user.count({ where: { email: d.email } })) {
    return { success: false, error: DUPLICATE_EMAIL, fieldErrors: { email: DUPLICATE_EMAIL } };
  }

  const saved: { images: string[]; doc: string | null } = { images: [], doc: null };
  const cleanup = async () => {
    await Promise.all(saved.images.map((p) => deleteVendorImage(p)));
    await deleteVendorDocument(saved.doc);
  };

  // Files first (server-side size + magic-byte checks), so a bad file never creates an account.
  // Each one is saved separately so an error points at the right field.
  const images: Partial<Record<"vendorImage" | "logo" | "coverImage", string>> = {};
  for (const key of ["vendorImage", "logo", "coverImage"] as const) {
    try {
      images[key] = await saveVendorImage(d[key]);
      saved.images.push(images[key]);
    } catch (error) {
      await cleanup();
      if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { [key]: error.message } };
      console.error("[vendors] image save failed", error);
      return { success: false, error: "We couldn't save the images. Your entries are kept — try again." };
    }
  }
  if (d.tinCertificate) {
    try {
      saved.doc = await saveVendorDocument(d.tinCertificate);
    } catch (error) {
      await cleanup();
      if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { tinCertificate: error.message } };
      console.error("[vendors] document save failed", error);
      return { success: false, error: "We couldn't save the certificate. Your entries are kept — try again." };
    }
  }
  const { vendorImage, logo, coverImage } = images as Record<"vendorImage" | "logo" | "coverImage", string>;

  try {

    const passwordHash = await bcrypt.hash(d.password, 12);
    const vendor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: `${d.firstName} ${d.lastName}`, email: d.email, passwordHash, role: "VENDOR" },
        select: { id: true },
      });
      const base = slugify(d.shopName, "store");
      const taken = await tx.vendor.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
      return tx.vendor.create({
        data: {
          userId: user.id,
          storeName: d.shopName,
          slug: nextFreeSlug(base, taken.map((t) => t.slug)),
          phone: `${d.countryCode} ${d.phone}`,
          storeAddress: d.shopAddress,
          status: "APPROVED",
          vendorImage,
          logo,
          coverImage,
          tinNumber: d.tinNumber ?? null,
          tinExpiresAt: d.tinExpiresAt ? new Date(`${d.tinExpiresAt}T00:00:00Z`) : null,
          tinCertificate: saved.doc,
        },
        select: { id: true },
      });
    });

    revalidateVendorPages(vendor.id);
    return { success: true, data: { id: vendor.id } };
  } catch (error) {
    await cleanup(); // nothing half-created: no orphan files
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("slug")) return { success: false, error: "That shop name was just taken. Try a slightly different one.", fieldErrors: { shopName: "Try a slightly different shop name" } };
      return { success: false, error: DUPLICATE_EMAIL, fieldErrors: { email: DUPLICATE_EMAIL } };
    }
    console.error("[vendors] create failed", error);
    return { success: false, error: "We couldn't create the vendor. Your entries are kept — try again." };
  }
}
