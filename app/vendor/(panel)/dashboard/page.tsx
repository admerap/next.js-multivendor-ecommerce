import { Package, PackagePlus, Settings, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { DashboardSkeleton } from "@/components/states/DashboardSkeleton";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { VendorDashboard } from "@/components/vendor/VendorDashboard";
import { requireArea } from "@/lib/auth-guard";
import { getVendorDashboard } from "@/lib/data/vendor-dashboard";

export const metadata: Metadata = { title: "Seller Dashboard" };

export default async function VendorDashboardPage() {
  const user = await requireArea("VENDOR");
  const data = await getVendorDashboard(user.vendorId!);
  const firstName = user.name?.split(/\s+/)[0] ?? "there";

  return (
    <PreviewStateFrame
      heading={
        <>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-fg-muted">
            Here&apos;s how <b className="text-fg-strong">{data.store.name}</b> is performing today.
          </p>
        </>
      }
      actions={
        <Link href="/vendor/products" className={buttonClasses.primary}>
          <Package aria-hidden className="size-4" strokeWidth={2} />
          Products
        </Link>
      }
      loading={<DashboardSkeleton />}
      empty={
        <EmptyState
          icon={ShoppingBag}
          title="No sales yet"
          description={`Once shoppers start ordering from ${data.store.name}, your analytics, wallet and top products will show up here.`}
        >
          <Link href="/vendor/products/new" className={buttonClasses.primary}>
            <PackagePlus aria-hidden className="size-4" strokeWidth={2} />
            Add your first product
          </Link>
          <Link href="/vendor/profile" className={buttonClasses.secondary}>
            <Settings aria-hidden className="size-4" strokeWidth={2} />
            Complete store profile
          </Link>
        </EmptyState>
      }
      error={{
        title: "Couldn't load your dashboard",
        description: "We couldn't reach your store analytics. Check your connection and try again.",
      }}
    >
      <VendorDashboard data={data} />
    </PreviewStateFrame>
  );
}
