"use client";

import {
  BarChart3,
  ChartLine,
  CircleDollarSign,
  FolderTree,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Star,
  Store,
  Tag,
  TicketPercent,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { DashShell, type NavGroup } from "./DashShell";
import type { SetupStep } from "./SetupGuide";

export type AdminCounts = {
  orders: number;
  customers: number;
  pendingVendors: number;
  /** Size of each Product Manage list (the same filters as the list pages). */
  products: { pending: number; approved: number; denied: number; featured: number; popular: number };
  /** Size of each Coupon Manage list. */
  coupons: { pending: number; approved: number; denied: number };
};

/** Admin sidebar (admindashboard design), limited to routes in CLAUDE.md §5. */
function adminNav(counts: AdminCounts): NavGroup[] {
  return [
    { title: "Overview", items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] },
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
      title: "Orders",
      items: [{ label: "All Orders", href: "/admin/orders", icon: ShoppingCart, count: counts.orders, tone: "iris" }],
    },
    {
      title: "Reports",
      items: [
        { label: "Earning Report", href: "/admin/reports/earnings", icon: CircleDollarSign },
        { label: "Order Report", href: "/admin/reports/orders", icon: ChartLine },
        { label: "Product Report", href: "/admin/reports/products", icon: BarChart3 },
        { label: "Transaction Report", href: "/admin/reports/transactions", icon: Receipt },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Customer List", href: "/admin/customers", icon: Users, count: counts.customers, tone: "iris" },
        { label: "Customer Reviews", href: "/admin/customers/reviews", icon: Star },
      ],
    },
  ];
}

export function AdminShell({
  user,
  counts,
  setupSteps,
  children,
}: {
  user: { name: string; email: string };
  counts: AdminCounts;
  setupSteps: SetupStep[];
  children: ReactNode;
}) {
  return (
    <DashShell
      badge="Admin"
      nav={adminNav(counts)}
      setupSteps={setupSteps}
      crumb="Dashboard"
      user={{ ...user, subtitle: "Sundry HQ · Administrator" }}
      profileLinks={{ settings: "/admin/profile", password: "/admin/change-password" }}
      quickLinks={[
        { label: "View storefront", href: "/", icon: Store },
        { label: "New orders", href: "/admin/orders?status=pending", icon: ShoppingCart },
      ]}
      withSearch
      withTheme
      footer="© 2026 Sundry Marketplace · Admin Panel"
    >
      {children}
    </DashShell>
  );
}
