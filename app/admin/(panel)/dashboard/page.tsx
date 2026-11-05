import { ListChecks, Send, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { NoAccess } from "@/components/admin/NoAccess";
import { EmptyState } from "@/components/data/DashCard";
import { DashboardSkeleton } from "@/components/states/DashboardSkeleton";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { getAccess, readableModules } from "@/lib/access.server";
import { requireArea } from "@/lib/auth-guard";
import { getAdminDashboard } from "@/lib/data/admin-dashboard";
import type { ModulePermissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin Dashboard" };

// The shortcuts follow the role: Invite needs Vendors › Create, Review needs Vendors › Read.
const emptyState = (vendors: ModulePermissions) => (
  <EmptyState
    icon={Store}
    title="No marketplace activity yet"
    description="When customers start ordering and vendors open their stores, marketplace analytics, earnings and top stores appear here."
  >
    {vendors.create && (
      <Link href="/admin/vendors/add" className={buttonClasses.primary}>
        <Send aria-hidden className="size-4" strokeWidth={2} />
        Invite vendors
      </Link>
    )}
    {vendors.read && (
      <Link href="/admin/vendors" className={buttonClasses.secondary}>
        <ListChecks aria-hidden className="size-4" strokeWidth={2} />
        Review vendors
      </Link>
    )}
  </EmptyState>
);

export default async function AdminDashboardPage() {
  const user = await requireArea("ADMIN");
  // Every admin lands here after signing in: a role without Dashboard › Read gets no analytics, just shortcuts.
  const access = await getAccess();
  if (!access?.permissions.dashboard.read) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">Welcome, {user.name ?? "Admin"}</h1>
          <p className="mt-1.5 text-[0.9rem] text-fg-muted">Sundry admin panel</p>
        </div>
        <NoAccess title="The dashboard isn't part of your role" readable={readableModules(access)} />
      </div>
    );
  }
  const data = await getAdminDashboard();

  return (
    <PreviewStateFrame
      heading={
        <>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">Welcome, Admin</h1>
          <p className="mt-1.5 text-[0.9rem] text-fg-muted">Monitor marketplace analytics across every store on Sundry.</p>
        </>
      }
      loading={<DashboardSkeleton />}
      empty={emptyState(access.permissions.vendors)}
      error={{
        title: "Couldn't load marketplace analytics",
        description: "We couldn't reach the analytics service. Check your connection and try again.",
      }}
    >
      {data.isEmpty ? emptyState(access.permissions.vendors) : <AdminDashboard data={data} />}
    </PreviewStateFrame>
  );
}
