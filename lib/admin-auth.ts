import "server-only";

import { auth } from "@/auth";

/**
 * Server-side role check for every admin Server Action (the page guard is not a security boundary).
 * The admin counterpart of `currentVendorId()` in lib/vendor-auth.ts.
 */
export async function isAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN";
}

/** The standard "not an admin" result; `what` names the area, e.g. "products". */
export const forbiddenResult = (what: string) => ({ success: false as const, error: `You don't have permission to manage ${what}.` });
