"use client";

import { ChartLine, KeyRound, LayoutDashboard, MessagesSquare, Package, Settings, ShoppingCart, Store, TicketPercent } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useChatPolling } from "@/components/chat/useChatPolling";
import { unreadTotalAction } from "@/lib/actions/chat";
import { CHAT_UNREAD_EVENT, LIST_POLL_MS } from "@/lib/chat";
import type { OrderStatusKey } from "@/lib/orders";
import { DashShell, type NavGroup } from "./DashShell";
import { IdleGuard } from "./IdleGuard";
import { orderManageNav } from "./orderNav";

/** This store's sub-orders per status (StoreOrder.status), for the Order Manage counts. */
export type VendorOrderCounts = Record<OrderStatusKey, number>;

/**
 * Seller Center sidebar (vendordashboard design) — only pages that exist. Product Reviews
 * (/vendor/reviews, CLAUDE.md §5) comes back here when it's built.
 */
const vendorNav = (orders: VendorOrderCounts, chatUnread: number): NavGroup[] => [
  { title: "Overview", items: [{ label: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard }] },
  {
    title: "Catalog",
    items: [
      {
        label: "Product Manage",
        icon: Package,
        children: [
          { label: "Product List", href: "/vendor/products" },
          { label: "Add Product", href: "/vendor/products/add" },
          { label: "Product Reviews", href: "/vendor/reviews" },
        ],
      },
      {
        label: "Coupon Manage",
        icon: TicketPercent,
        children: [
          { label: "Coupon List", href: "/vendor/coupons" },
          { label: "Add Coupon", href: "/vendor/coupons/add" },
        ],
      },
    ],
  },
  {
    title: "Orders",
    items: [
      orderManageNav("/vendor/orders", orders),
      {
        label: "Report Manage",
        icon: ChartLine,
        // Read-only analytics of this store's orders (vendor*report designs).
        children: [
          { label: "Transactions Report", href: "/vendor/reports/transactions" },
          { label: "Product Report", href: "/vendor/reports/products" },
          { label: "Order Report", href: "/vendor/reports/orders" },
        ],
      },
      // Customer messages (PRD FR-V13): the badge counts unread ones and hides at 0.
      { label: "Chat Box", href: "/vendor/chat", icon: MessagesSquare, count: chatUnread, tone: "saffron" },
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
  orderCounts,
  chatUnread: initialUnread,
  signedInAt,
  children,
}: {
  user: { name: string; email: string };
  storeName: string;
  orderCounts: VendorOrderCounts;
  /** unread customer messages (layout), then kept fresh: polling + the chat's read events */
  chatUnread: number;
  /** session sign-in time (ms) — IdleGuard's 12-hour limit */
  signedInAt?: number;
  children: ReactNode;
}) {
  const [chatUnread, setChatUnread] = useState(initialUnread);
  const refresh = async () => {
    const r = await unreadTotalAction();
    if (r.ok) setChatUnread(r.data);
  };
  useChatPolling(refresh, LIST_POLL_MS);
  useEffect(() => {
    const on = () => void refresh();
    window.addEventListener(CHAT_UNREAD_EVENT, on);
    return () => window.removeEventListener(CHAT_UNREAD_EVENT, on);
  }, []);

  return (
    <DashShell
      badge="Seller"
      nav={vendorNav(orderCounts, chatUnread)}
      crumb="Dashboard"
      user={{ ...user, subtitle: storeName }}
      profileLinks={{ settings: "/vendor/profile", password: "/vendor/change-password" }}
      quickLinks={[
        { label: "View storefront", href: "/", icon: Store },
        { label: "New orders", href: "/vendor/orders?status=pending", icon: ShoppingCart },
      ]}
      footer="© 2026 Sundry Marketplace · Seller Center"
    >
      <IdleGuard area="VENDOR" signedInAt={signedInAt} />
      {children}
    </DashShell>
  );
}
