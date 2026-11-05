import "server-only";

import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email.server";
import { passwordResetEmail } from "@/lib/emails/password-reset";

/**
 * Password recovery (PRD FR-V2 "forgot password", for every role). Stored in Auth.js's VerificationToken table
 * (unused otherwise) as identifier "password-reset:<userId>" — no schema change.
 *
 *  - The emailed token is 32 random bytes; only its SHA-256 is stored, so a database leak gives no usable links.
 *  - Single use, 30 minutes. Asking again replaces the previous link; at most one email a minute per account.
 *  - The request never says whether an email has an account (same answer either way); blocked accounts get none.
 *  - Resetting changes the password hash, which ends every session of that account (auth.ts password stamp).
 *  - Links are built from NEXT_PUBLIC_APP_URL, never from the request's Host header (no link poisoning).
 */

export const RESET_MINUTES = 30;
const RESET_MS = RESET_MINUTES * 60_000;
const RESEND_AFTER_MS = 60_000;
const PREFIX = "password-reset:";
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Emails a reset link if the account exists and isn't blocked. Always resolves the same way for the caller. */
export async function requestPasswordReset(email: string): Promise<void> {
  const now = Date.now();
  // Housekeeping: drop every expired reset token (any account).
  await prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: PREFIX }, expires: { lt: new Date(now) } } });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, blockedAt: true, deletedAt: true } });
  if (!user || user.blockedAt || user.deletedAt) return;

  const identifier = PREFIX + user.id;
  // A link was sent less than a minute ago (expires = sent + 30 min): don't send another.
  const recent = await prisma.verificationToken.findFirst({ where: { identifier, expires: { gt: new Date(now + RESET_MS - RESEND_AFTER_MS) } }, select: { token: true } });
  if (recent) return;

  const raw = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }), // the newest link replaces older ones
    prisma.verificationToken.create({ data: { identifier, token: hash(raw), expires: new Date(now + RESET_MS) } }),
  ]);
  // Not awaited: answering as fast for a real account as for an unknown email keeps timing from telling them apart.
  void sendEmail(passwordResetEmail({ to: user.email, name: user.name, link: `${appUrl()}/reset-password?token=${raw}`, minutes: RESET_MINUTES }));
}

/** The account a still-valid link belongs to (for the reset page), or null if unknown / used / expired. */
export async function findResetAccount(raw: string): Promise<{ userId: string; email: string; role: Role } | null> {
  const row = await prisma.verificationToken.findFirst({ where: { token: hash(raw), identifier: { startsWith: PREFIX }, expires: { gt: new Date() } } });
  if (!row) return null;
  const user = await prisma.user.findUnique({ where: { id: row.identifier.slice(PREFIX.length) }, select: { id: true, email: true, role: true, blockedAt: true, deletedAt: true } });
  return user && !user.blockedAt && !user.deletedAt ? { userId: user.id, email: user.email, role: user.role } : null;
}

/**
 * Sets the new password and burns the link (and any other reset link of that account). Returns the role —
 * for the login page to send them to — or null when the link is no longer valid.
 */
export async function resetPassword(raw: string, password: string): Promise<Role | null> {
  const account = await findResetAccount(raw);
  if (!account) return null;
  const passwordHash = await bcrypt.hash(password, 12);
  // Burning the token is the gate: two submits of the same link can't both succeed.
  const burned = await prisma.verificationToken.deleteMany({ where: { token: hash(raw), identifier: PREFIX + account.userId } });
  if (burned.count === 0) return null;
  await prisma.$transaction([
    prisma.user.update({ where: { id: account.userId }, data: { passwordHash } }),
    prisma.verificationToken.deleteMany({ where: { identifier: PREFIX + account.userId } }),
  ]);
  return account.role;
}
