import type { ReactNode } from "react";
import { VendorShell } from "@/components/shell/VendorShell";
import { requireArea } from "@/lib/auth-guard";
import { chatViewer, unreadTotal } from "@/lib/chat.server";
import { prisma } from "@/lib/db";
import { noOrders } from "@/lib/orders";

/** Seller Center frame (vendordashboard design). Server-side role + approval check; proxy.ts does the same. */
export default async function VendorPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("VENDOR");
  // Scoped by the session's vendorId, never a client-supplied id.
  const viewer = await chatViewer();
  const [store, byStatus, chatUnread] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId! }, select: { storeName: true } }),
    prisma.storeOrder.groupBy({ by: ["status"], where: { vendorId: user.vendorId! }, _count: { _all: true } }),
    viewer ? unreadTotal(viewer) : 0,
  ]);
  const orderCounts = noOrders();
  for (const row of byStatus) orderCounts[row.status] = row._count._all;

  return (
    <VendorShell user={{ name: user.name ?? "Seller", email: user.email ?? "" }} storeName={store.storeName} orderCounts={orderCounts} chatUnread={chatUnread} signedInAt={user.signedInAt}>
      {children}
    </VendorShell>
  );
}
