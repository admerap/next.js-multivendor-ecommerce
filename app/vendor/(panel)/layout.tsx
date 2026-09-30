import type { ReactNode } from "react";
import { VendorShell } from "@/components/shell/VendorShell";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/** Seller Center frame (vendordashboard design). Server-side role + approval check; proxy.ts does the same. */
export default async function VendorPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("VENDOR");
  // Scoped by the session's vendorId, never a client-supplied id.
  const store = await prisma.vendor.findUniqueOrThrow({
    where: { id: user.vendorId! },
    select: { storeName: true },
  });

  return (
    <VendorShell user={{ name: user.name ?? "Seller", email: user.email ?? "" }} storeName={store.storeName}>
      {children}
    </VendorShell>
  );
}
