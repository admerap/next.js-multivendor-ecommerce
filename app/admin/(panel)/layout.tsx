import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";
import type { SetupStep } from "@/components/shell/SetupGuide";
import { adminOrderStatusCounts } from "@/lib/admin-orders.server";
import { getAccess, readableModules } from "@/lib/access.server";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { noOrders } from "@/lib/orders";
import type { PermissionModule } from "@/lib/permissions";

/** Admin frame (admindashboard design). Server-side role check; proxy.ts does the same optimistically. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("ADMIN");
  const access = await getAccess();
  // Sidebar counts only for the modules this role can open: the others are neither queried nor sent to the
  // browser (they'd travel in the page even with the menu item hidden). The Setup Guide (Super Admin) needs all.
  const can = (m: PermissionModule) => !!access?.permissions[m].read;
  const zero = <T,>(v: T) => Promise.resolve(v);
  const noGroups: { approvalStatus: string; _count: { _all: number } }[] = [];
  const [customers, pendingVendors, approvedStores, brands, productsByStatus, featured, popular, couponsByStatus, orders, pendingReviews, openTickets] =
    await Promise.all([
      can("customers") ? prisma.user.count({ where: { role: "CUSTOMER" } }) : zero(0),
      can("vendors") ? prisma.vendor.count({ where: { status: "PENDING" } }) : zero(0),
      access?.isSuper ? prisma.vendor.count({ where: { status: "APPROVED" } }) : zero(0),
      access?.isSuper ? prisma.brand.count() : zero(0),
      can("products") ? prisma.product.groupBy({ by: ["approvalStatus"], _count: { _all: true } }) : zero(noGroups),
      can("products") ? prisma.product.count({ where: { isFeatured: true } }) : zero(0),
      can("products") ? prisma.product.count({ where: { isPopular: true } }) : zero(0),
      can("coupons") ? prisma.coupon.groupBy({ by: ["approvalStatus"], _count: { _all: true } }) : zero(noGroups),
      can("orders") ? adminOrderStatusCounts() : zero(noOrders()), // Order Manage: orders per overall status
      can("reviews") ? prisma.review.count({ where: { status: "PENDING" } }) : zero(0), // Review Manage: reviews waiting for moderation
      can("support") ? prisma.supportTicket.count({ where: { status: "OPEN" } }) : zero(0), // Support Tickets: waiting on staff
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
      user={{
        name: access?.name ?? user.name ?? "Admin",
        email: access?.email ?? user.email ?? "",
        role: access?.roleName ?? "No role",
        image: access?.image ?? null,
      }}
      readable={readableModules(access)}
      permissions={access?.permissions}
      counts={{ orders, pendingVendors, products, coupons, reviews: { pending: pendingReviews }, customers, openTickets }}
      // The launch checklist is the Super Admin's to-do list.
      setupSteps={access?.isSuper ? setupSteps : undefined}
      signedInAt={user.signedInAt}
    >
      {children}
    </AdminShell>
  );
}
