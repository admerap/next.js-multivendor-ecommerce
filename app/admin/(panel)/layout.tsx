import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/** Admin frame (admindashboard design). Server-side role check; proxy.ts does the same optimistically. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("ADMIN");
  const [customers, stores] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendor.count(),
  ]);

  return (
    <AdminShell user={{ name: user.name ?? "Admin", email: user.email ?? "" }} counts={{ orders: 0, customers, stores }}>
      {children}
    </AdminShell>
  );
}
