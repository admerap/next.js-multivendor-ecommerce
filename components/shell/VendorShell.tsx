"use client";

import {
  BarChart3,
  ChartLine,
  KeyRound,
  LayoutDashboard,
  Package,
  PackagePlus,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  Store,
  TicketPercent,
} from "lucide-react";
import type { ReactNode } from "react";
import { DashShell, type NavGroup } from "./DashShell";

/** Seller Center sidebar (vendordashboard design), limited to routes in CLAUDE.md §5. */
const NAV: NavGroup[] = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard }] },
  {
    title: "Catalog",
    items: [
      { label: "Product List", href: "/vendor/products", icon: Package },
      { label: "Add New Product", href: "/vendor/products/new", icon: PackagePlus },
      { label: "Product Reviews", href: "/vendor/reviews", icon: Star },
    ],
  },
  { title: "Orders", items: [{ label: "All Orders", href: "/vendor/orders", icon: ShoppingCart, count: 0, tone: "iris" }] },
  { title: "Promotions", items: [{ label: "Coupons", href: "/vendor/coupons", icon: TicketPercent }] },
  {
    title: "Reports",
    items: [
      { label: "Transactions Report", href: "/vendor/reports/transactions", icon: Receipt },
      { label: "Product Report", href: "/vendor/reports/products", icon: BarChart3 },
      { label: "Order Report", href: "/vendor/reports/orders", icon: ChartLine },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Shop Settings", href: "/vendor/profile", icon: Settings },
      { label: "Change Password", href: "/vendor/change-password", icon: KeyRound },
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
      nav={NAV}
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
