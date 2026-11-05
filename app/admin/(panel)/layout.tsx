import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";
import type { SetupStep } from "@/components/shell/SetupGuide";
import { adminOrderStatusCounts } from "@/lib/admin-orders.server";
import { getAccess, readableModules } from "@/lib/access.server";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/** Admin frame (admindashboard design). Server-side role check; proxy.ts does the same optimistically. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("ADMIN");
  const access = await getAccess();
  const [customers, pendingVendors, approvedStores, brands, productsByStatus, featured, popular, couponsByStatus, orders, pendingReviews] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.brand.count(),
    prisma.product.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    prisma.product.count({ where: { isFeatured: true } }),
    prisma.product.count({ where: { isPopular: true } }),
    prisma.coupon.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    adminOrderStatusCounts(), // Order Manage: orders per overall status
    prisma.review.count({ where: { status: "PENDING" } }), // Review Manage: reviews waiting for moderation
  ]);
  // Sidebar list sizes — the same filters the Product / Coupon Manage pages use.
  const byStatus = (rows: { approvalStatus: string; _count: { _all: number } }[]) => {
    const n = (s: string) => rows.find((r) => r.approvalStatus === s)?._count._all ?? 0;
    return { pending: n("PENDING"), approved: n("APPROVED"), denied: n("REJECTED") };
  };
  const products = { ...byStatus(productsByStatus), featured, popular };
  const coupons = byStatus(couponsByStatus);

  // Marketplace launch checklist behind the sidebar "Setup Guide" (real data, not a fixed percentage).
  const setupSteps: SetupStep[] = [
    { label: "Add your first brand", description: "Brands let shoppers filter products across stores.", href: "/admin/brands", done: brands > 0 },
    {
      label: "Approve a vendor store",
      description: "Review pending applications so sellers can start listing.",
      href: "/admin/vendors/approval",
      done: approvedStores > 0,
    },
    { label: "Welcome your first customer", description: "Share the storefront so shoppers can create accounts.", href: "/", done: customers > 0 },
    {
      label: "Approve a vendor product",
      description: "Review product requests so they can go live on the storefront.",
      href: "/admin/products/pending",
      done: products.approved > 0,
    },
  ];

  return (
    <AdminShell
      user={{ name: access?.name ?? user.name ?? "Admin", email: access?.email ?? user.email ?? "", role: access?.roleName ?? "No role", image: access?.image ?? null }}
      readable={readableModules(access)}
      permissions={access?.permissions}
      counts={{ orders, pendingVendors, products, coupons, reviews: { pending: pendingReviews }, customers }}
      // The launch checklist is the Super Admin's to-do list.
      setupSteps={access?.isSuper ? setupSteps : undefined}
      signedInAt={user.signedInAt}
    >
      {children}
    </AdminShell>
  );
}
