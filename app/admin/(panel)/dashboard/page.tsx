import { ListChecks, Send, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { EmptyState } from "@/components/data/DashCard";
import { DashboardSkeleton } from "@/components/states/DashboardSkeleton";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { requireArea } from "@/lib/auth-guard";
import { getAdminDashboard } from "@/lib/data/admin-dashboard";

export const metadata: Metadata = { title: "Admin Dashboard" };

const emptyState = (
  <EmptyState
    icon={Store}
    title="No marketplace activity yet"
    description="When customers start ordering and vendors open their stores, marketplace analytics, earnings and top stores appear here."
  >
    <Link href="/admin/vendors/new" className={buttonClasses.primary}>
      <Send aria-hidden className="size-4" strokeWidth={2} />
      Invite vendors
    </Link>
    <Link href="/admin/vendors" className={buttonClasses.secondary}>
      <ListChecks aria-hidden className="size-4" strokeWidth={2} />
      Review vendors
    </Link>
  </EmptyState>
);

export default async function AdminDashboardPage() {
  await requireArea("ADMIN");
  const data = await getAdminDashboard();

  return (
    <PreviewStateFrame
      heading={
        <>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            Welcome, Admin
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-fg-muted">Monitor marketplace analytics across every store on Sundry.</p>
        </>
      }
      loading={<DashboardSkeleton />}
      empty={emptyState}
      error={{
        title: "Couldn't load marketplace analytics",
        description: "We couldn't reach the analytics service. Check your connection and try again.",
      }}
    >
      {data.isEmpty ? emptyState : <AdminDashboard data={data} />}
    </PreviewStateFrame>
  );
}
