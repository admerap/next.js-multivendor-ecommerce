import { Plus, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ProfileSkeleton } from "@/components/account/ProfileSkeleton";
import { EmptyState } from "@/components/data/DashCard";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { buttonClasses } from "@/components/ui/button-classes";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Profile Info" };

export default async function DashboardPage() {
  const sessionUser = await requireArea("CUSTOMER");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { name: true, email: true, phone: true },
  });
  const [firstName, ...rest] = user.name.trim().split(/\s+/);

  return (
    <PreviewStateFrame
      className="mb-2 flex flex-wrap items-center justify-between gap-3"
      errorCard={false}
      heading={<h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">Profile Info</h1>}
      loading={<ProfileSkeleton />}
      empty={
        <EmptyState
          bare
          icon={User}
          title="Complete your profile"
          description="You haven't added your details yet. Add your name and contact info to speed up checkout."
        >
          <Link href="/dashboard" className={buttonClasses.primary}>
            <Plus aria-hidden className="size-4" strokeWidth={2} />
            Add details
          </Link>
        </EmptyState>
      }
      error={{
        title: "Couldn't load your profile",
        description: "Something went wrong fetching your account details. Please try again.",
      }}
    >
      <ProfileForm
        initial={{ firstName: firstName ?? "", lastName: rest.join(" "), email: user.email, phone: user.phone ?? "" }}
      />
    </PreviewStateFrame>
  );
}
