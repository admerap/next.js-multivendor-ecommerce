"use server";

import { auth } from "@/auth";
import { changeOwnPassword, SESSION_EXPIRED, type PasswordActionResult } from "@/lib/password.server";

export type { PasswordActionResult };

/**
 * Changes the signed-in vendor's OWN password. Only an approved vendor gets past the role check; the
 * account id comes from the session. The shared core (lib/password.server) verifies the old password,
 * saves the new hash and ends the session so the vendor signs in again with the new password.
 */
export async function changeVendorPassword(input: unknown): Promise<PasswordActionResult> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED") {
    return { success: false, error: SESSION_EXPIRED };
  }
  return changeOwnPassword(me.id, input, "vendor");
}
