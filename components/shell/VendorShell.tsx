"use client";

import { BarChart3, House, Package, Settings, ShoppingCart, Store, TicketPercent } from "lucide-react";
import type { ReactNode } from "react";
import { DashShell, type NavSection } from "./DashShell";

/** Seller Center sidebar: sections from vendordashboard, limited to routes in CLAUDE.md §5. */
const status = (label: string, key: string, tone: NonNullable<NavSection["groups"][0]["items"][0]["tone"]>) => ({
  label,
  href: `/vendor/orders?status=${key}`,
  count: 0,
  tone,
  dot: true,
});

const SECTIONS: NavSection[] = [
  {
    key: "home",
    label: "Home",
    icon: House,
    groups: [{ title: "Overview", items: [{ label: "Dashboard", href: "/vendor/dashboard" }] }],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: Package,
    groups: [
      {
        title: "Products",
        items: [
          { label: "Product List", href: "/vendor/products" },
          { label: "Add New Product", href: "/vendor/products/new" },
        ],
      },
      { title: "Product Reviews", items: [{ label: "Product Reviews", href: "/vendor/reviews" }] },
    ],
  },
  {
    key: "orders",
    label: "Orders",
    icon: ShoppingCart,
    groups: [
      {
        title: "Sales",
        items: [
          { label: "All Orders", href: "/vendor/orders", count: 0, tone: "iris" },
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
    key: "promotions",
    label: "Promotions",
    icon: TicketPercent,
    groups: [{ title: "Promotion Management", items: [{ label: "Coupons", href: "/vendor/coupons" }] }],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    groups: [
      {
        title: "Reports & Analytics",
        items: [
          { label: "Transactions Report", href: "/vendor/reports/transactions" },
          { label: "Product Report", href: "/vendor/reports/products" },
          { label: "Order Report", href: "/vendor/reports/orders" },
        ],
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    groups: [
      {
        title: "Store",
        items: [
          { label: "Shop settings", href: "/vendor/profile" },
          { label: "Change Password", href: "/vendor/change-password" },
        ],
      },
    ],
  },
];

export function VendorShell({
  user,
  storeName,
  children,
}: {
  user: { name: string; email: string };
  storeName: string;
  children: ReactNode;
}) {
  return (
    <DashShell
      badge="Seller"
      sections={SECTIONS}
      crumb="Dashboard"
      user={{ ...user, subtitle: storeName }}
      profileLinks={{ settings: "/vendor/profile", password: "/vendor/change-password" }}
      quickLinks={[
        { label: "View storefront", href: "/", icon: Store },
        { label: "New orders", href: "/vendor/orders?status=pending", icon: ShoppingCart },
      ]}
      footer="© 2026 Sundry Marketplace · Seller Center"
    >
      {children}
    </DashShell>
  );
}
