import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { redirectFor, VENDOR_PENDING_PATH } from "@/lib/auth-routes";

const AREA_ROOT = {
  CUSTOMER: "/dashboard",
  VENDOR: "/vendor/dashboard",
  VENDOR_PENDING: VENDOR_PENDING_PATH,
  ADMIN: "/admin/dashboard",
} as const;

/**
 * Server-side guard for protected layouts/pages (defense in depth behind proxy.ts).
 * Redirects anyone who may not see `area` and returns the signed-in user otherwise.
 */
export async function requireArea(area: keyof typeof AREA_ROOT) {
  const session = await auth();
  const user = session?.user;
  const target = redirectFor(AREA_ROOT[area], user ? { role: user.role, vendorStatus: user.vendorStatus } : null);
  if (target || !user) redirect(target ?? "/login");
  return user;
}
