import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { redirectFor } from "@/lib/auth-routes";

/**
 * Optimistic role gate for every protected area. Protected layouts repeat the check on the
 * server (lib/auth-guard.ts), so this is a fast first line, not the only one.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const viewer = user ? { role: user.role, vendorStatus: user.vendorStatus } : null;

  const target = redirectFor(pathname, viewer);
  if (!target || target === pathname) return NextResponse.next();

  const url = new URL(target, req.nextUrl);
  // Send guests back where they were headed after they sign in.
  if (!viewer) url.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/vendor/:path*", "/admin/:path*", "/login", "/register"],
};
