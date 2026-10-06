"use server";

import { Prisma, type BrandStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { nextFreeSlug, slugify } from "@/lib/slug";
import { deleteBrandImage, saveBrandImage, UploadError } from "@/lib/uploads";
import {
  brandCreateSchema,
  brandIdSchema,
  brandListSchema,
  brandStatusSchema,
  brandUpdateSchema,
} from "@/lib/validations/brand";

export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: BrandStatus;
  productsCount: number;
  createdAt: string;
};

export type BrandDetail = BrandRow & {
  products: { total: number; active: number; inactive: number };
};

const DUPLICATE = "A brand with this name already exists";
const LIST_PATH = "/admin/brands";

/** Every action re-checks the role on the server; the page guard is not a security boundary. */
async function isAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN";
}
const forbidden = <T>(): ActionResult<T> => ({ success: false, error: "You don't have permission to manage brands." });

function invalid<T>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { success: false, error: "Please fix the highlighted fields", fieldErrors };
}

const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function uniqueSlug(name: string, exceptId?: string) {
  const base = slugify(name, "brand");
  const taken = await prisma.brand.findMany({
    where: { slug: { startsWith: base }, ...(exceptId && { NOT: { id: exceptId } }) },
    select: { slug: true },
  });
  return nextFreeSlug(base, taken.map((b) => b.slug));
}

/**
 * Products per brand. TODO(catalog): replace with `_count: { select: { products: true } }` once
 * the Product model (with brandId) exists. Until then every brand has 0 products.
 */
async function productCounts(brandIds: string[]): Promise<Map<string, { total: number; active: number }>> {
  return new Map(brandIds.map((id) => [id, { total: 0, active: 0 }]));
}

function toRow(b: { id: string; name: string; slug: string; image: string | null; status: BrandStatus; createdAt: Date }, productsCount: number): BrandRow {
  return { ...b, productsCount, createdAt: b.createdAt.toISOString() };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getBrands(
  params: unknown,
): Promise<ActionResult<{ items: BrandRow[]; total: number; page: number; pageSize: number; pageCount: number }>> {
  if (!(await isAdmin())) return forbidden();
  const { q, status, brand, page, pageSize } = brandListSchema.parse(params ?? {});

  const where: Prisma.BrandWhereInput = {
    ...(q && { name: { contains: q } }),
    ...(status !== "ALL" && { status }),
    ...(brand && { id: brand }),
  };

  try {
    const total = await prisma.brand.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pageCount);
    const brands = await prisma.brand.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, slug: true, image: true, status: true, createdAt: true },
    });
    const counts = await productCounts(brands.map((b) => b.id));
    return {
      success: true,
      data: {
        items: brands.map((b) => toRow(b, counts.get(b.id)?.total ?? 0)),
        total,
        page: current,
        pageSize,
        pageCount,
      },
    };
  } catch (error) {
    console.error("[brands] list failed", error);
    return { success: false, error: "We couldn't load brands. Please try again." };
  }
}

export async function getBrand(id: unknown): Promise<ActionResult<BrandDetail | null>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = brandIdSchema.safeParse({ id });
  if (!parsed.success) return { success: true, data: null };

  try {
    const brand = await prisma.brand.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, name: true, slug: true, image: true, status: true, createdAt: true },
    });
    if (!brand) return { success: true, data: null };
    const c = (await productCounts([brand.id])).get(brand.id) ?? { total: 0, active: 0 };
    return {
      success: true,
      data: { ...toRow(brand, c.total), products: { total: c.total, active: c.active, inactive: c.total - c.active } },
    };
  } catch (error) {
    console.error("[brands] get failed", error);
    return { success: false, error: "We couldn't load this brand. Please try again." };
  }
}

export type BrandOption = { id: string; name: string };

/** Every brand, A→Z — for the "All brands" filter. */
export async function getBrandOptions(): Promise<ActionResult<BrandOption[]>> {
  if (!(await isAdmin())) return forbidden();
  try {
    return { success: true, data: await prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) };
  } catch (error) {
    console.error("[brands] options failed", error);
    return { success: false, error: "We couldn't load brands. Please try again." };
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createBrand(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = brandCreateSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    image: formData.get("image"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { name, status, image } = parsed.data;

  if (await prisma.brand.findFirst({ where: { name }, select: { id: true } })) {
    return { success: false, error: DUPLICATE, fieldErrors: { name: DUPLICATE } };
  }

  let imagePath: string | null = null;
  try {
    imagePath = await saveBrandImage(image);
    const brand = await prisma.brand.create({
      data: { name, slug: await uniqueSlug(name), status, image: imagePath },
      select: { id: true },
    });
    revalidatePath(LIST_PATH);
    return { success: true, data: brand };
  } catch (error) {
    await deleteBrandImage(imagePath); // don't leave an orphan file behind
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { image: error.message } };
    if (isUnique(error)) return { success: false, error: DUPLICATE, fieldErrors: { name: DUPLICATE } };
    console.error("[brands] create failed", error);
    return { success: false, error: "We couldn't create the brand. Please try again." };
  }
}

export async function updateBrand(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = brandUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    image: formData.get("image") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, status, image } = parsed.data;

  const current = await prisma.brand.findUnique({ where: { id }, select: { name: true, slug: true, image: true } });
  if (!current) return { success: false, error: "This brand no longer exists." };
  if (await prisma.brand.findFirst({ where: { name, NOT: { id } }, select: { id: true } })) {
    return { success: false, error: DUPLICATE, fieldErrors: { name: DUPLICATE } };
  }

  let newImage: string | null = null;
  try {
    if (image) newImage = await saveBrandImage(image); // no new file → keep the current image
    await prisma.brand.update({
      where: { id },
      data: {
        name,
        status,
        ...(name !== current.name && { slug: await uniqueSlug(name, id) }),
        ...(newImage && { image: newImage }),
      },
    });
    if (newImage) await deleteBrandImage(current.image); // replaced → remove the old file
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    await deleteBrandImage(newImage);
    if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { image: error.message } };
    if (isUnique(error)) return { success: false, error: DUPLICATE, fieldErrors: { name: DUPLICATE } };
    console.error("[brands] update failed", error);
    return { success: false, error: "We couldn't save the brand. Please try again." };
  }
}

export async function toggleBrandStatus(input: unknown): Promise<ActionResult<{ status: BrandStatus }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = brandStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid status change." };

  try {
    const brand = await prisma.brand.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
      select: { status: true },
    });
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${parsed.data.id}`);
    return { success: true, data: brand };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "This brand no longer exists." };
    }
    console.error("[brands] toggle failed", error);
    return { success: false, error: "We couldn't update the status. Please try again." };
  }
}

export async function deleteBrand(input: unknown): Promise<ActionResult<{ productsCount?: number }>> {
  if (!(await isAdmin())) return forbidden();
  const parsed = brandIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid brand." };
  const { id } = parsed.data;

  const brand = await prisma.brand.findUnique({ where: { id }, select: { name: true, image: true } });
  if (!brand) return { success: false, error: "This brand no longer exists." };

  // Never orphan products: block the delete and point the admin to deactivation instead.
  const productsCount = (await productCounts([id])).get(id)?.total ?? 0;
  if (productsCount > 0) {
    return {
      success: false,
      error: `"${brand.name}" is used by ${productsCount} ${productsCount === 1 ? "product" : "products"}. Deactivate it instead, or move those products to another brand first.`,
      data: { productsCount },
    };
  }

  try {
    await prisma.brand.delete({ where: { id } });
    await deleteBrandImage(brand.image);
    revalidatePath(LIST_PATH);
    return { success: true, data: {} };
  } catch (error) {
    console.error("[brands] delete failed", error);
    return { success: false, error: "We couldn't delete the brand. Please try again." };
  }
}
