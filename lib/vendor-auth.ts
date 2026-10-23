import "server-only";

import { auth } from "@/auth";

/**
 * The signed-in, approved vendor's store id — the ONLY source of vendorId for vendor actions.
 * Returns null for guests, other roles and vendors that aren't approved.
 */
export async function currentVendorId(): Promise<string | null> {
  const me = (await auth())?.user;
  if (!me || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED" || !me.vendorId) return null;
  return me.vendorId;
}
