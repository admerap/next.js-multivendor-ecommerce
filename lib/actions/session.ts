"use server";

import { auth, signOut, unstable_update } from "@/auth";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { expiredReason, isTimedRole } from "@/lib/session-policy";

/**
 * Staff session timing (lib/session-policy) — called by IdleGuard in the admin and vendor shells.
 */

/**
 * The person is using the app (IdleGuard reports real mouse / keyboard / scroll / touch activity at most once
 * a minute). Re-issues the session token with a fresh activeAt (auth.ts jwt callback, trigger "update").
 * Returns false once the session is already gone (timed out on the server, signed out elsewhere, blocked).
 */
export async function reportActivityAction(): Promise<boolean> {
  const user = (await auth())?.user;
  if (!user || !isTimedRole(user.role)) return false;
  await unstable_update({});
  return true;
}

/**
 * Automatic sign-out (inactivity or the 12-hour limit): ends the session and opens the role's login page with
 * the reason, so the person knows why they're there. Only `idle` / `max` are accepted.
 */
export async function expireSessionAction(reason: unknown, area: unknown): Promise<void> {
  const why = expiredReason(reason) ?? "idle";
  // The session may already be gone on the server, so the shell says which login page it belongs to.
  const role = (await auth())?.user.role ?? (area === "ADMIN" || area === "VENDOR" ? area : "CUSTOMER");
  await signOut({ redirectTo: `${LOGIN_PATH[role]}?expired=${why}` });
}
