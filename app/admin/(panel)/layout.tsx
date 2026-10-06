import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";
import type { SetupStep } from "@/components/shell/SetupGuide";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/** Admin frame (admindashboard design). Server-side role check; proxy.ts does the same optimistically. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("ADMIN");
  const [customers, pendingVendors, approvedStores, brands] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.brand.count(),
  ]);

  // Marketplace launch checklist behind the sidebar "Setup Guide" (real data, not a fixed percentage).
  const setupSteps: SetupStep[] = [
    { label: "Add your first brand", description: "Brands let shoppers filter products across stores.", href: "/admin/brands", done: brands > 0 },
    { label: "Approve a vendor store", description: "Review pending applications so sellers can start listing.", href: "/admin/vendors/approval", done: approvedStores > 0 },
    { label: "Welcome your first customer", description: "Share the storefront so shoppers can create accounts.", href: "/admin/customers", done: customers > 0 },
    // TODO(catalog): mark done once the Product model exists and an in-house product is listed.
    { label: "Add an in-house product", description: "List a Sundry Official product to seed the catalog.", href: "/admin/products/new", done: false },
  ];

  return (
    <AdminShell
      user={{ name: user.name ?? "Admin", email: user.email ?? "" }}
      counts={{ orders: 0, customers, pendingVendors }}
      setupSteps={setupSteps}
    >
      {children}
    </AdminShell>
  );
}
