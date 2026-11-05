import type { Metadata } from "next";
import { NoAccess } from "@/components/admin/NoAccess";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { getAccess, readableModules } from "@/lib/access.server";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "No access" };

/** Where a page guard sends an admin whose role can't open that module (lib/access.server `requirePermission`). */
export default async function NoAccessPage() {
  await requireArea("ADMIN");
  const access = await getAccess();
  return (
    <>
      <SetBreadcrumbs items={[{ label: "No access" }]} />
      <NoAccess title="You don't have access to this page" readable={readableModules(access)} />
    </>
  );
}
