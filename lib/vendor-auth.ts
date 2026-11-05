import "server-only";

import { auth } from "@/auth";

/**
 * The signed-in, approved vendor's store id — the ONLY source of vendorId for vendor actions.
 * Returns null for guests, other roles and vendors that aren't approved.
 */
export async function currentVendorId(): Promise<string | null> {
  return (await currentVendor())?.vendorId ?? null;
}

/** Same check, plus the signed-in user's id — for actions that record who did what (order history). */
export async function currentVendor(): Promise<{ vendorId: string; userId: string } | null> {
  const me = (await auth())?.user;
  if (!me || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED" || !me.vendorId || !me.id) return null;
  return { vendorId: me.vendorId, userId: me.id };
}
