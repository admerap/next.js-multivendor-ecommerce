import { LayoutDashboard, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { VendorProfileSnapshot } from "@/app/vendor/(panel)/profile/actions";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { ProfileSkeleton } from "@/components/vendor/profile/ProfileSkeleton";
import { ProfileTabs } from "@/components/vendor/profile/ProfileTabs";
import { VendorProfileForm } from "@/components/vendor/profile/VendorProfileForm";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Profile Settings" };

/**
 * Seller Center › Profile Settings (vendorProfile design). Renders inside the vendor panel layout,
 * so the header and sidebar stay mounted — only this main content changes.
 */
export default async function VendorProfilePage() {
  const user = await requireArea("VENDOR");
  // Scoped by the session — a vendor only ever loads their own User + Vendor rows.
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      vendor: {
        select: { vendorImage: true, storeName: true, storeAddress: true, logo: true, coverImage: true, tinNumber: true, tinExpiresAt: true, tinCertificate: true },
      },
    },
  });
  if (!me.vendor) throw new Error("This account has no store"); // → error.tsx (Retry)

  const initial: VendorProfileSnapshot = {
    name: me.name,
    email: me.email,
    phone: me.phone,
    photo: me.vendor.vendorImage,
    storeName: me.vendor.storeName,
    storeAddress: me.vendor.storeAddress,
    logo: me.vendor.logo,
    coverImage: me.vendor.coverImage,
    tinNumber: me.vendor.tinNumber,
    tinExpiresAt: me.vendor.tinExpiresAt ? me.vendor.tinExpiresAt.toISOString().slice(0, 10) : null,
    hasTinCertificate: !!me.vendor.tinCertificate, // the file itself stays private
  };

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Profile Settings" }]} />
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
            <ProfileTabs active="/vendor/profile" />
            <ProfileSkeleton />
          </>
        }
        empty={
          <>
            <ProfileTabs active="/vendor/profile" />
            <EmptyState
              icon={UserRound}
              title="Complete your seller profile"
              description={`Add your name, phone and a profile photo so buyers know who runs ${me.vendor.storeName}.`}
            />
          </>
        }
        error={{ title: "Couldn't load your profile", description: "Please check your connection and try again." }}
      >
        <ProfileTabs active="/vendor/profile" />
        <VendorProfileForm initial={initial} />
      </PreviewStateFrame>
    </>
  );
}
