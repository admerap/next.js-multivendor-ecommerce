import type { Role, VendorStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      vendorId: string | null;
      vendorStatus: VendorStatus | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    vendorId: string | null;
    vendorStatus: VendorStatus | null;
  }
}
