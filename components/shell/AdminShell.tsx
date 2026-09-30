"use client";

import { BarChart3, House, Package, ShoppingCart, Store, Users } from "lucide-react";
import type { ReactNode } from "react";
import { DashShell, type NavSection } from "./DashShell";

/** Admin sidebar: sections from admindashboard, limited to routes in CLAUDE.md §5. */
function adminSections(counts: { orders: number; customers: number; stores: number }): NavSection[] {
  const status = (label: string, key: string, tone: NonNullable<NavSection["groups"][0]["items"][0]["tone"]>) => ({
    label,
    href: `/admin/orders?status=${key}`,
    count: 0,
    tone,
    dot: true,
  });
  return [
    {
      key: "home",
      label: "Home",
      icon: House,
      groups: [{ title: "Overview", items: [{ label: "Dashboard", href: "/admin/dashboard" }] }],
    },
    {
      key: "orders",
      label: "Orders",
      icon: ShoppingCart,
      groups: [
        {
          title: "All Stores",
          items: [
            { label: "All Orders", href: "/admin/orders", count: counts.orders, tone: "iris" },
            status("Pending", "pending", "info"),
            status("Confirmed", "confirmed", "iris"),
            status("Packaging", "packaging", "warning"),
            status("Out for Delivery", "out_for_delivery", "iris"),
            status("Delivered", "delivered", "success"),
            status("Returned", "returned", "neutral"),
            status("Failed to Deliver", "failed", "error"),
            status("Canceled", "canceled", "error"),
          ],
        },
      ],
    },
    {
      key: "catalog",
      label: "Catalog",
      icon: Package,
      groups: [
        {
          title: "In-house Products",
          items: [
            { label: "Product List", href: "/admin/products" },
            { label: "Add New Product", href: "/admin/products/new" },
            { label: "Limited Stock", href: "/admin/products/stock" },
          ],
        },
        { title: "Vendor Products", items: [{ label: "New Product Requests", href: "/admin/products/requests" }] },
      ],
    },
    {
      key: "reports",
      label: "Reports",
      icon: BarChart3,
      groups: [
        {
          title: "Reports & Analytics",
          items: [
            { label: "Earning Report", href: "/admin/reports/earnings" },
            { label: "Order Report", href: "/admin/reports/orders" },
            { label: "Product Report", href: "/admin/reports/products" },
            { label: "Transaction Report", href: "/admin/reports/transactions" },
          ],
        },
      ],
    },
    {
      key: "people",
      label: "People",
      icon: Users,
      groups: [
        {
          title: "Customers",
          items: [
            { label: "Customer List", href: "/admin/customers", count: counts.customers, tone: "iris" },
            { label: "Customer Reviews", href: "/admin/customers/reviews" },
          ],
        },
        {
          title: "Vendors",
          items: [
            { label: "Add New Vendor", href: "/admin/vendors/new" },
            { label: "Vendor List", href: "/admin/vendors", count: counts.stores, tone: "saffron" },
          ],
        },
      ],
    },
  ];
}

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string };
  counts: { orders: number; customers: number; stores: number };
  children: ReactNode;
}) {
  return (
    <DashShell
      badge="Admin"
      sections={adminSections(counts)}
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
