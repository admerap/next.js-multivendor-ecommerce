import type { Role, VendorStatus } from "@prisma/client";

export const LOGIN_PATH = {
  CUSTOMER: "/login",
  VENDOR: "/vendor/login",
  ADMIN: "/admin/login",
} as const satisfies Record<Role, string>;

export const VENDOR_PENDING_PATH = "/vendor/pending";

/** Public auth pages. Signed-in users visiting these are sent to their home. */
export const AUTH_PAGES = [
  "/login",
  "/register",
  "/vendor/login",
  "/vendor/register",
  "/admin/login",
] as const;

export type Viewer = { role: Role; vendorStatus?: VendorStatus | null } | null;

/** Where a signed-in user belongs. Vendors that aren't approved are held on the pending screen. */
export function homeFor(role: Role, vendorStatus?: VendorStatus | null): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return vendorStatus === "APPROVED" ? "/vendor/dashboard" : VENDOR_PENDING_PATH;
  return "/dashboard";
}

const within = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page);
}

/** The area a protected path belongs to, or null for public pages. */
export function areaOf(pathname: string): Role | "VENDOR_PENDING" | null {
  if (isAuthPage(pathname)) return null;
  if (within(pathname, "/admin")) return "ADMIN";
  if (within(pathname, VENDOR_PENDING_PATH)) return "VENDOR_PENDING";
  if (within(pathname, "/vendor")) return "VENDOR";
  if (within(pathname, "/dashboard") || within(pathname, "/account")) return "CUSTOMER";
  return null;
}

/**
 * Single access rule shared by the proxy, protected layouts and post-login redirects.
 * Returns null when the viewer may see the page, otherwise the path to send them to.
 */
export function redirectFor(pathname: string, viewer: Viewer): string | null {
  if (viewer && isAuthPage(pathname)) return homeFor(viewer.role, viewer.vendorStatus);

  const area = areaOf(pathname);
  if (!area) return null;

  if (!viewer) {
    if (area === "ADMIN") return LOGIN_PATH.ADMIN;
    if (area === "VENDOR" || area === "VENDOR_PENDING") return LOGIN_PATH.VENDOR;
    return LOGIN_PATH.CUSTOMER;
  }

  const allowed =
    area === "VENDOR_PENDING"
      ? viewer.role === "VENDOR" && viewer.vendorStatus !== "APPROVED"
      : area === "VENDOR"
        ? viewer.role === "VENDOR" && viewer.vendorStatus === "APPROVED"
        : viewer.role === area;

  return allowed ? null : homeFor(viewer.role, viewer.vendorStatus);
}

/** Only follow same-origin relative callbacks the viewer is actually allowed to open. */
export function safeCallbackUrl(callbackUrl: unknown, viewer: NonNullable<Viewer>): string {
  const home = homeFor(viewer.role, viewer.vendorStatus);
  if (typeof callbackUrl !== "string" || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return home;
  }
  const pathname = callbackUrl.split(/[?#]/)[0];
  if (isAuthPage(pathname) || redirectFor(pathname, viewer) !== null) return home;
  return callbackUrl;
}
