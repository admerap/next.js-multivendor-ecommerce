"use client";

import { ChartLine, FolderTree, LayoutDashboard, Package, Percent, ShoppingCart, Star, Store, Tag, TicketPercent, UserCog } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPermissionsProvider } from "@/components/admin/AdminPermissions";
import type { OrderStatusKey } from "@/lib/orders";
import { moduleForPath, noPermissions, type PermissionModule, type RolePermissions } from "@/lib/permissions";
import { DashShell, type NavGroup, type NavItem } from "./DashShell";
import { IdleGuard } from "./IdleGuard";
import { orderManageNav } from "./orderNav";
import type { SetupStep } from "./SetupGuide";

export type AdminCounts = {
  /** orders per OVERALL status (lib/admin-orders.server — each order counted once) */
  orders: Record<OrderStatusKey, number>;
  pendingVendors: number;
  /** Size of each Product Manage list (the same filters as the list pages). */
  products: { pending: number; approved: number; denied: number; featured: number; popular: number };
  /** Size of each Coupon Manage list. */
  coupons: { pending: number; approved: number; denied: number };
  /** Review Manage: reviews waiting for moderation. */
  reviews: { pending: number };
  /** Customer accounts (role CUSTOMER). */
  customers: number;
};

/**
 * Admin sidebar (admindashboard design) — only pages that exist (Report Manage's are being built now).
 * The profile pages from CLAUDE.md §5 come back here when they're built.
 */
function adminNav(counts: AdminCounts): NavGroup[] {
  return [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        {
          label: "Users",
          icon: UserCog,
          // The admin panel's staff and (next) what each of them can access.
          children: [
            { label: "Roles", href: "/admin/roles" },
            { label: "Users", href: "/admin/users" },
          ],
        },
      ],
    },
    {
      title: "Catalog",
      items: [
        { label: "Brands", href: "/admin/brands", icon: Tag },
        {
          label: "Category Setup",
          icon: FolderTree,
          children: [
            { label: "Categories", href: "/admin/categories" },
            { label: "Sub-Categories", href: "/admin/categories/sub" },
            { label: "Sub-Sub-Categories", href: "/admin/categories/sub-sub" },
          ],
        },
        {
          label: "Vendor Manage",
          icon: Store,
          count: counts.pendingVendors, // vendors waiting for approval
          tone: "saffron",
          children: [
            { label: "Vendor Approval", href: "/admin/vendors/approval" },
            { label: "Add New Vendor", href: "/admin/vendors/add" },
            { label: "Vendor List", href: "/admin/vendors" },
          ],
        },
        {
          label: "Product Manage",
          icon: Package,
          count: counts.products.pending, // vendor products waiting for review
          tone: "saffron",
          // Every list shows its size; only Pending (needs action) is saffron.
          children: [
            { label: "Pending Product", href: "/admin/products/pending", count: counts.products.pending, tone: "saffron" },
            { label: "Approved Product", href: "/admin/products/approved", count: counts.products.approved, tone: "iris" },
            { label: "Denied Product", href: "/admin/products/denied", count: counts.products.denied, tone: "iris" },
            { label: "Featured Product", href: "/admin/products/featured", count: counts.products.featured, tone: "iris" },
            { label: "Popular Product", href: "/admin/products/popular", count: counts.products.popular, tone: "iris" },
          ],
        },
        orderManageNav("/admin/orders", counts.orders),
        {
          label: "Review Manage",
          icon: Star,
          count: counts.reviews.pending, // reviews waiting for moderation
          tone: "saffron",
          children: [
            { label: "Customer Review", href: "/admin/reviews", count: counts.reviews.pending, tone: "saffron" },
            { label: "Customer List", href: "/admin/customers", count: counts.customers, tone: "iris" },
          ],
        },
        {
          label: "Report Manage",
          icon: ChartLine,
          // Read-only, platform-wide analytics (admin*report designs) — the counterpart of the vendor reports.
          children: [
            { label: "Earnings Report", href: "/admin/reports/earnings" },
            { label: "Product Report", href: "/admin/reports/products" },
            { label: "Product Stock Report", href: "/admin/reports/stock" },
            { label: "Order Report", href: "/admin/reports/orders" },
          ],
        },
        {
          label: "Coupon Manage",
          icon: TicketPercent,
          count: counts.coupons.pending, // vendor coupons waiting for review
          tone: "saffron",
          children: [
            { label: "Pending Coupon", href: "/admin/coupons/pending", count: counts.coupons.pending, tone: "saffron" },
            { label: "Approved Coupon", href: "/admin/coupons/approved", count: counts.coupons.approved, tone: "iris" },
            { label: "Denied Coupon", href: "/admin/coupons/denied", count: counts.coupons.denied, tone: "iris" },
          ],
        },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "Tax Rates", href: "/admin/settings/tax-rates", icon: Percent }],
    },
  ];
}

export function AdminShell({
  user,
  counts,
  setupSteps,
  readable,
  permissions,
  signedInAt,
  children,
}: {
  user: { name: string; email: string; role: string; image: string | null };
  counts: AdminCounts;
  setupSteps?: SetupStep[];
  /** modules the role may read: the menu shows only these (lib/access.server) */
  readable: PermissionModule[];
  /** the role's full matrix — buttons ask it via useCan (components/admin/AdminPermissions) */
  permissions?: RolePermissions;
  /** session sign-in time (ms) — IdleGuard's 12-hour limit */
  signedInAt?: number;
  children: ReactNode;
}) {
  return (
    <DashShell
      badge="Admin"
      nav={visibleNav(adminNav(counts), readable, permissions ?? noPermissions())}
      setupSteps={setupSteps}
      crumb="Dashboard"
      user={{ name: user.name, email: user.email, image: user.image, subtitle: `Sundry HQ · ${user.role}` }}
      // Account menu: Profile (own details, photo and password) · Log out.
      profileLinks={{ profile: "/admin/profile" }}
      quickLinks={[
        { label: "View storefront", href: "/", icon: Store },
        ...(readable.includes("orders") ? [{ label: "New orders", href: "/admin/orders?status=pending", icon: ShoppingCart }] : []),
      ]}
      withSearch
      withTheme
      footer="© 2026 Sundry Marketplace · Admin Panel"
    >
      <IdleGuard area="ADMIN" signedInAt={signedInAt} />
      <AdminPermissionsProvider permissions={permissions ?? noPermissions()}>{children}</AdminPermissionsProvider>
    </DashShell>
  );
}

/**
 * The menu for a role: links to modules it can't read are dropped, a dropdown with no links left goes, and so
 * does a section with no items. Links outside any module stay. "Add …" pages also need Create (CREATE_PAGES).
 */
/** Pages that create something: shown only to a role with Create in their module. */
const CREATE_PAGES = new Set(["/admin/vendors/add"]);

function visibleNav(nav: NavGroup[], readable: PermissionModule[], permissions: RolePermissions): NavGroup[] {
  const ok = (href: string) => {
    const m = moduleForPath(href);
    if (!m) return true;
    return readable.includes(m) && (!CREATE_PAGES.has(href.split("?")[0]) || permissions[m].create);
  };
  const item = (i: NavItem): NavItem | null => {
    if (!i.children) return i.href && !ok(i.href) ? null : i;
    const children = i.children.filter((c) => ok(c.href));
    return children.length > 0 ? { ...i, children } : null;
  };
  return nav.map((g) => ({ ...g, items: g.items.map(item).filter((i): i is NavItem => i !== null) })).filter((g) => g.items.length > 0);
}
