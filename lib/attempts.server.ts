import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Wrong-password brake, kept in the database (AuthAttempt) so it holds across restarts and server instances:
 * after `max` failures for a key within WINDOW_MS, further tries are refused until the oldest one ages out.
 *  - Sign in: per email (5) and per IP (20) — slows guessing one account and spraying many (auth.ts).
 *  - Change Password / changing your email: per account (5) — an unattended open session can't be used to guess.
 * Keys are stored hashed (no emails or IPs in clear). A success clears that key; rows older than a day are pruned.
 */
const WINDOW_MS = 15 * 60_000;
const KEEP_MS = 24 * 60 * 60_000;
export const ATTEMPT_LIMIT = { account: 5, ip: 20 } as const;

const hashed = (key: string) => createHash("sha256").update(key).digest("base64url");

/** Minutes left until `key` may try again, or 0 when it may try now. */
export async function lockedFor(key: string, max: number = ATTEMPT_LIMIT.account, now = Date.now()): Promise<number> {
  const since = new Date(now - WINDOW_MS);
  const recent = await prisma.authAttempt.findMany({ where: { key: hashed(key), createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  if (recent.length < max) return 0;
  // Locked until the attempt that would bring it back under the limit leaves the window.
  const unlockAt = recent[recent.length - max]!.createdAt.getTime() + WINDOW_MS;
  return Math.max(1, Math.ceil((unlockAt - now) / 60_000));
}

export async function recordFailure(key: string, now = Date.now()) {
  await prisma.authAttempt.create({ data: { key: hashed(key), createdAt: new Date(now) } });
  // Light housekeeping: about one call in 50 drops rows older than a day.
  if (Math.random() < 0.02) await prisma.authAttempt.deleteMany({ where: { createdAt: { lt: new Date(now - KEEP_MS) } } });
}

export async function clearFailures(key: string) {
  await prisma.authAttempt.deleteMany({ where: { key: hashed(key) } });
}

export const lockedMessage = (minutes: number) => `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
export const signInLockedMessage = (minutes: number) =>
  `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`;
