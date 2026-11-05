import "server-only";

import { auth } from "@/auth";
import { getAccess } from "@/lib/access.server";

/**
 * Server-side role check for every admin Server Action (the page guard is not a security boundary).
 * The admin counterpart of `currentVendorId()` in lib/vendor-auth.ts.
 */
export async function isAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN";
}

/**
 * Whether the signed-in admin holds the Super Admin (system) role. Read from the database on every request, so a
 * role change applies at once (the session token doesn't carry the staff role).
 */
export async function isSuperAdmin() {
  return !!(await getAccess())?.isSuper;
}

/** The standard "not an admin" result; `what` names the area, e.g. "products". */
export const forbiddenResult = (what: string) => ({ success: false as const, error: `You don't have permission to manage ${what}.` });
