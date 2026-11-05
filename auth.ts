import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { staffSessionExpired } from "@/lib/session-policy";
import { loginSchema } from "@/lib/validations/auth";

// Compared against when the email is unknown so both failure paths cost one bcrypt round.
const DUMMY_HASH = bcrypt.hashSync("sundry-timing-equalizer", 12);

/**
 * Short fingerprint of the stored bcrypt hash (never the password). Kept in the encrypted session
 * token so a password change ends every other session too: a new hash means a new fingerprint.
 */
const passwordStamp = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("base64url").slice(0, 22);

/** Right password, but an admin blocked the account (User.blockedAt). Only ever raised after the password matched. */
export class BlockedAccount extends CredentialsSignin {
  code = "blocked";
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials requires JWT sessions; the adapter's DB sessions are never used.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  logger: {
    // A wrong password (or a blocked account) is an expected outcome, not a server error worth a stack trace.
    error(error) {
      if (error instanceof CredentialsSignin || error.name === "CredentialsSignin") return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, role: true, passwordHash: true, blockedAt: true, deletedAt: true },
        });

        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        // A deleted (staff) account signs in like an unknown email.
        if (!user || !valid || user.deletedAt) return null;
        // Checked after the password so a blocked status never tells a stranger the account exists.
        if (user.blockedAt) throw new BlockedAccount();

        return { id: user.id, name: user.name, email: user.email, role: user.role, pwv: passwordStamp(user.passwordHash) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const now = Date.now();
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.pwv = user.pwv;
        token.signedInAt = now;
        token.activeAt = now;
      }
      // Sessions issued before the staff time limits existed start their clock now.
      token.signedInAt ??= now;
      token.activeAt ??= now;
      // unstable_update() = the person did something: the browser's activity report (IdleGuard, at most once a
      // minute) or a profile edit. Background polling never calls it, so it can't keep a session alive.
      if (trigger === "update") {
        token.activeAt = now;
        // Profile edits: only name/email may change this way, never role.
        if (session?.user) {
          if (typeof session.user.name === "string") token.name = session.user.name;
          if (typeof session.user.email === "string") token.email = session.user.email;
        }
      }
      // Staff (admin, vendor): 30 minutes without activity, or 12 hours after signing in, ends the session
      // (lib/session-policy). Returning null deletes the cookie → back to the login page.
      if (staffSessionExpired({ role: token.role, signedInAt: token.signedInAt, activeAt: token.activeAt }, now)) return null;
      // Re-read the store on every request so admin approval/suspension takes effect without re-login.
      // The same query checks the password stamp: if the password changed since this session was
      // issued (or the account is gone), returning null deletes the session cookie → back to login.
      if (token.role === "VENDOR" && token.id) {
        const account = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordHash: true, blockedAt: true, vendor: { select: { id: true, status: true } } },
        });
        if (!account || account.blockedAt || token.pwv !== passwordStamp(account.passwordHash)) return null;
        token.vendorId = account.vendor?.id ?? null;
        token.vendorStatus = account.vendor?.status ?? null;
      } else {
        // Admin › Customer List › Block ends an open session on its next request (no orders, reviews or
        // account edits with it): a blocked or deleted account gets no session. A new password (changed, or
        // reset from a "Forgot password?" link) ends every other session too, like for vendors.
        if (token.id) {
          const account = await prisma.user.findUnique({ where: { id: token.id }, select: { blockedAt: true, deletedAt: true, passwordHash: true } });
          if (!account || account.blockedAt || account.deletedAt) return null;
          if (token.pwv && token.pwv !== passwordStamp(account.passwordHash)) return null;
        }
        token.vendorId = null;
        token.vendorStatus = null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.vendorId = token.vendorId;
      session.user.vendorStatus = token.vendorStatus;
      session.user.signedInAt = token.signedInAt;
      return session;
    },
  },
});
