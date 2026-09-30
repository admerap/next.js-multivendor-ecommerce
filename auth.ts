import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

// Compared against when the email is unknown so both failure paths cost one bcrypt round.
const DUMMY_HASH = bcrypt.hashSync("sundry-timing-equalizer", 12);

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials requires JWT sessions; the adapter's DB sessions are never used.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  logger: {
    // A wrong password is an expected outcome, not a server error worth a stack trace.
    error(error) {
      if (error.name === "CredentialsSignin") return;
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
          select: { id: true, name: true, email: true, role: true, passwordHash: true },
        });

        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      // Profile edits call unstable_update(); only name/email may change this way, never role.
      if (trigger === "update" && session?.user) {
        if (typeof session.user.name === "string") token.name = session.user.name;
        if (typeof session.user.email === "string") token.email = session.user.email;
      }
      // Re-read the store on every request so admin approval/suspension takes effect without re-login.
      if (token.role === "VENDOR" && token.id) {
        const vendor = await prisma.vendor.findUnique({
          where: { userId: token.id },
          select: { id: true, status: true },
        });
        token.vendorId = vendor?.id ?? null;
        token.vendorStatus = vendor?.status ?? null;
      } else {
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
      return session;
    },
  },
});
