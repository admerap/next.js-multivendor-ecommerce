import { KeyRound, LayoutDashboard, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Skeleton } from "@/components/states/Skeleton";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/vendor/profile/ChangePasswordForm";
import { ProfileTabs } from "@/components/vendor/profile/ProfileTabs";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Change Password" };

const skeleton = (
  <section role="status" aria-label="Loading password settings" className="overflow-hidden rounded-lg bg-card shadow-sm">
    <Skeleton className="h-15 rounded-none" />
    <div className="grid gap-4.5 px-4 py-6 sm:px-6 md:grid-cols-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-md" />
      ))}
    </div>
  </section>
);

/**
 * Seller Center › Change Password (vendorchangepassword design). Same page frame as Profile Settings;
 * renders inside the vendor panel layout so the header and sidebar stay mounted.
 */
export default async function VendorChangePasswordPage() {
  await requireArea("VENDOR");

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Profile Settings", href: "/vendor/profile" }, { label: "Change Password" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <h1 className="flex items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
              <UserRound aria-hidden className="size-5" strokeWidth={1.9} />
            </span>
            Profile Information
          </h1>
        }
        actions={
          <Button asChild>
            <Link href="/vendor/dashboard" className="!text-on-primary">
              <LayoutDashboard aria-hidden />
              Dashboard
            </Link>
          </Button>
        }
        loading={
          <>
            <ProfileTabs active="/vendor/change-password" />
            {skeleton}
          </>
        }
        empty={
          <>
            <ProfileTabs active="/vendor/change-password" />
            <EmptyState icon={KeyRound} title="No password set yet" description="Set a password to sign in to the Seller Center with your email." />
          </>
        }
        error={{ title: "Couldn't load your profile", description: "Please check your connection and try again." }}
      >
        <ProfileTabs active="/vendor/change-password" />
        <ChangePasswordForm />
      </PreviewStateFrame>
    </>
  );
}
