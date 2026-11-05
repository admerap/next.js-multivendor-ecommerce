import type { Role, VendorStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    /** Password-hash fingerprint, set at sign-in (see auth.ts). */
    pwv?: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      vendorId: string | null;
      vendorStatus: VendorStatus | null;
      /** ms epoch of the sign-in (staff sessions end 12 h later — lib/session-policy). */
      signedInAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    vendorId: string | null;
    vendorStatus: VendorStatus | null;
    pwv?: string;
    /** ms epoch: when this session signed in, and the last real activity the browser reported. */
    signedInAt?: number;
    activeAt?: number;
  }
}
