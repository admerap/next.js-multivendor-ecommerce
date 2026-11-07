"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { addressIdSchema, MAX_SAVED_ADDRESSES, savedAddressSchema } from "@/lib/validations/checkout";

export type AddressResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string> };

const GONE: AddressResult = { success: false, error: "This address no longer exists. Refresh the page." };
const refresh = () => revalidatePath("/dashboard/addresses");

/**
 * My Address › Save: add a new address or update one of the signed-in customer's own (id from the session, never
 * trusted from the form). Same rules as a checkout address. The first address becomes the default; at most
 * MAX_SAVED_ADDRESSES per customer.
 */
export async function saveAddressAction(input: unknown): Promise<AddressResult> {
  const user = await requireArea("CUSTOMER");
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = savedAddressSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { success: false, error: "Please check the highlighted fields", fieldErrors };
  }
  const a = parsed.data;
  const data = {
    type: a.type,
    name: a.name,
    phone: a.phone,
    country: a.country,
    state: a.state || null,
    city: a.city,
    zip: a.zip,
    address: a.address,
    address2: a.address2 || null,
  };
  try {
    if (raw.id) {
      const id = addressIdSchema.safeParse({ id: raw.id });
      if (!id.success) return GONE;
      // Only the owner's row is touched: a foreign id updates nothing.
      const r = await prisma.address.updateMany({ where: { id: id.data.id, userId: user.id }, data });
      if (r.count === 0) return GONE;
      refresh();
      return { success: true, message: "Address updated" };
    }
    const count = await prisma.address.count({ where: { userId: user.id } });
    if (count >= MAX_SAVED_ADDRESSES) return { success: false, error: `You can save up to ${MAX_SAVED_ADDRESSES} addresses. Delete one to add another.` };
    await prisma.address.create({ data: { ...data, userId: user.id, isDefault: count === 0 } });
    refresh();
    return { success: true, message: "Address saved" };
  } catch (error) {
    console.error("[addresses] save failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't save the address. Please try again." };
  }
}

/** My Address › Delete: one of the customer's own addresses. Deleting the default makes the newest other one the default. */
export async function deleteAddressAction(input: unknown): Promise<AddressResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = addressIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const row = await prisma.address.findFirst({ where: { id: parsed.data.id, userId: user.id }, select: { isDefault: true } });
    if (!row) return GONE;
    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: parsed.data.id } });
      if (row.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    refresh();
    return { success: true, message: "Address deleted" };
  } catch (error) {
    console.error("[addresses] delete failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't delete the address. Please try again." };
  }
}

/** My Address › Set as default: exactly one default per customer. */
export async function setDefaultAddressAction(input: unknown): Promise<AddressResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = addressIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const row = await prisma.address.findFirst({ where: { id: parsed.data.id, userId: user.id }, select: { id: true } });
    if (!row) return GONE;
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: row.id }, data: { isDefault: true } }),
    ]);
    refresh();
    return { success: true, message: "Default address updated" };
  } catch (error) {
    console.error("[addresses] set default failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't change the default address. Please try again." };
  }
}
