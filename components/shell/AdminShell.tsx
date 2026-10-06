"use client";

import {
  BarChart3,
  Boxes,
  ChartLine,
  CircleDollarSign,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  PackagePlus,
  Receipt,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { DashShell, type NavGroup } from "./DashShell";
import type { SetupStep } from "./SetupGuide";

/** Admin sidebar (admindashboard design), limited to routes in CLAUDE.md §5. */
function adminNav(counts: { orders: number; customers: number; pendingVendors: number }): NavGroup[] {
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
        { label: "Product List", href: "/admin/products", icon: Package },
        { label: "Add New Product", href: "/admin/products/new", icon: PackagePlus },
        { label: "Limited Stock", href: "/admin/products/stock", icon: Boxes },
        { label: "New Product Requests", href: "/admin/products/requests", icon: ClipboardList },
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
  counts: { orders: number; customers: number; pendingVendors: number };
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
