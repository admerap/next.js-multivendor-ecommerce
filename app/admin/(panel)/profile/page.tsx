import { KeyRound, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { AdminProfile } from "@/components/admin/profile/AdminProfile";
import { PillTabs } from "@/components/data/PillTabs";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { getAccess } from "@/lib/access.server";
import { changeMyPasswordAction } from "@/lib/actions/admin-profile";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { firstParams } from "@/lib/list-params";
import { splitName } from "@/lib/validations/admin-user";

export const metadata: Metadata = { title: "Profile" };

const PATH = "/admin/profile";
const TABS = [
  { label: "Profile Information", href: PATH, icon: UserRound },
  { label: "Change Password", href: `${PATH}?tab=password`, icon: KeyRound },
] as const;

/**
 * Admin › Profile (account menu): the summary card (photo, name, role, contact) stays on the left; on the right,
 * one card whose header is the tabs — Profile Information or Change Password — and whose body is the one picked.
 * The tab lives in the URL (?tab=password). Open to every admin whatever their role — it's their own account. Reads fresh from the
 * database (the id from the session).
 */
export default async function AdminProfilePage({ searchParams }: PageProps<"/admin/profile">) {
  const user = await requireArea("ADMIN");
  const tab = firstParams(await searchParams).tab === "password" ? "password" : "info";
  const [access, me] = await Promise.all([
    getAccess(),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, image: true, blockedAt: true, updatedAt: true },
    }), // throws → error.tsx (Retry)
  ]);
  const { first, last } = splitName(me.name);

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Profile", href: PATH },
          ...(tab === "password" ? [{ label: "Change Password" }] : []),
        ]}
      />
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">My Profile</h1>
          <p className="mt-1 text-sm text-fg-muted">Your photo and contact details in the admin panel, and your password.</p>
        </div>
        <AdminProfile
          // A fresh form after each save (the refresh brings the new values and photo).
          key={me.updatedAt.getTime()}
          initial={{ firstName: first, lastName: last, phone: me.phone ?? "", email: me.email }}
          image={me.image}
          role={access?.roleName ?? "No role"}
          isSuperAdmin={!!access?.isSuper}
          status={me.blockedAt ? "inactive" : "active"}
          tab={tab}
          tabs={<PillTabs tabs={TABS} active={tab === "password" ? TABS[1].href : TABS[0].href} label="Profile sections" />}
          passwordPanel={<PasswordCard />}
        />
      </div>
    </>
  );
}

/** Change Password tab: the body under the tabs (the card and its header are AdminProfile's). */
function PasswordCard() {
  return (
    <div className="px-5 py-6 sm:px-7">
      <p className="mb-6 text-sm text-fg-muted">After updating, you&apos;ll be signed out and can sign in with your new password.</p>
      <ChangePasswordForm action={changeMyPasswordAction} signInHref="/admin/login" />
    </div>
  );
}
