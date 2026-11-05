import type { Role } from "@prisma/client";

/**
 * Session lifetime for staff accounts (admin + vendor) — one place for the server (auth.ts) and the browser
 * (IdleGuard). Customers keep the normal 30-day session: they only ever see their own orders and addresses.
 *
 *  - Inactivity: 30 minutes without the person using the app (mouse, keyboard, scroll, touch) signs them out.
 *    Background polling (chat, badges) never counts — only real activity, reported by the browser at most
 *    once a minute. A warning with "Stay signed in" shows a minute before.
 *  - Maximum: 12 hours after signing in, even while active, they sign in again (caps a stolen session).
 */
export const TIMED_ROLES: readonly Role[] = ["ADMIN", "VENDOR"];
export const isTimedRole = (role: Role | undefined | null) => !!role && TIMED_ROLES.includes(role);

export const IDLE_LIMIT_MS = 30 * 60_000;
/** The warning dialog opens this long before the inactivity sign-out. */
export const IDLE_WARNING_MS = 60_000;
export const MAX_SESSION_MS = 12 * 60 * 60_000;
/** "Your session ends in 5 minutes" before the 12-hour limit. */
export const MAX_WARNING_MS = 5 * 60_000;
/** How often (at most) the browser tells the server the person is active. */
export const ACTIVITY_PING_MS = 60_000;
/** Server-side slack for that once-a-minute report, so the browser's countdown always finishes first. */
export const SERVER_IDLE_GRACE_MS = 2 * 60_000;

/** ?expired=… on the login page after an automatic sign-out. */
export type ExpiredReason = "idle" | "max";
export const EXPIRED_MESSAGE: Record<ExpiredReason, string> = {
  idle: "You were signed out after 30 minutes of inactivity. Sign in again to continue.",
  max: "For your security, sessions end 12 hours after signing in. Sign in again to continue.",
};
export const expiredReason = (v: unknown): ExpiredReason | undefined => (v === "idle" || v === "max" ? v : undefined);

/** The server-side rule (auth.ts jwt callback): has this staff session run out? Customers never do here. */
export function staffSessionExpired(t: { role?: Role | null; signedInAt: number; activeAt: number }, now = Date.now()): ExpiredReason | null {
  if (!isTimedRole(t.role)) return null;
  if (now - t.signedInAt > MAX_SESSION_MS) return "max";
  if (now - t.activeAt > IDLE_LIMIT_MS + SERVER_IDLE_GRACE_MS) return "idle";
  return null;
}
