import { ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { AdminRoleTable } from "@/components/admin/roles/AdminRoleTable";
import { NewRoleButton } from "@/components/admin/roles/RoleFormDialog";
import { EmptyState } from "@/components/data/DashCard";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportTabs } from "@/components/reports/ReportKit";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { getAccess, requirePermission } from "@/lib/access.server";
import { listAdminRoles } from "@/lib/admin-roles.server";
import { firstParams } from "@/lib/list-params";
import { adminRoleListSchema } from "@/lib/validations/admin-role";

export const metadata: Metadata = { title: "Admin Roles" };

const PATH = "/admin/roles";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the roles. Check your connection and try again." };
const noRoles = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState
      bare
      icon={ShieldCheck}
      title="No roles yet"
      description="Create a role for each kind of job in the admin panel — support, accounting, warehouse…"
    />
  </section>
);
const noDeleted = <EmptyState bare icon={Trash2} title="No deleted roles" description="Roles you delete show up here, and you can restore them any time." />;

/**
 * Admin › Users › Roles (like the reference): the admin panel's staff roles. Search, page and the Roles / Deleted
 * view live in the URL; deleted roles are soft-deleted and can be restored from the Deleted view.
 */
export default async function AdminRolesPage({ searchParams }: PageProps<"/admin/roles">) {
  await requirePermission("roles");
  const params = adminRoleListSchema.parse(firstParams(await searchParams));
  const [data, access] = await Promise.all([listAdminRoles(params), getAccess()]); // throws → error.tsx (Retry)
  // The role decides: New Role needs Roles › Create; Edit and Permissions › Update; Delete / Restore › Delete.
  const viewer = { isSuper: !!access?.isSuper, roleId: access?.roleId ?? null, permissions: access!.permissions };
  const deletedView = params.view === "deleted";
  const view = { q: params.q || undefined, view: deletedView ? "deleted" : undefined };
  const tabs = [
    { label: `Roles (${data.live})`, href: PATH, current: !deletedView },
    { label: `Deleted (${data.deleted})`, href: `${PATH}?view=deleted`, current: deletedView },
  ];
  const nothing = deletedView ? data.deleted === 0 : data.live === 0;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Users" }, { label: "Roles" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={ShieldCheck} title="Admin Roles" total={data.live} noun="roles" />
            <p className="mt-1 text-sm text-fg-muted">What each kind of job in the admin panel is for. Permissions per role come next.</p>
          </div>
        }
        actions={viewer.permissions.roles.create ? <NewRoleButton /> : undefined}
        loading={<ListSkeleton label="Loading roles" />}
        empty={noRoles}
        error={ERROR}
      >
        <div className="flex flex-col gap-4">
          {(data.deleted > 0 || deletedView) && <ReportTabs label="Role views" tabs={tabs} />}
          {nothing && !deletedView ? (
            noRoles
          ) : (
            <section aria-labelledby="role-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="role-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                  {deletedView ? "Deleted roles" : "Role list"}
                  <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
                </h2>
                {!nothing && <SearchForm action={PATH} q={params.q} placeholder="Search by name or description" keep={{ view: view.view }} />}
              </div>
              <div className="border-t border-line">
                {nothing ? (
                  noDeleted
                ) : data.rows.length > 0 ? (
                  <>
                    <AdminRoleTable rows={data.rows} offset={(data.page - 1) * data.pageSize} viewer={viewer} />
                    <Pagination
                      page={data.page}
                      pageCount={data.pageCount}
                      total={data.total}
                      pageSize={data.pageSize}
                      noun="roles"
                      params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                    />
                  </>
                ) : (
                  <NoMatches noun="roles" q={params.q} />
                )}
              </div>
            </section>
          )}
        </div>
      </PreviewStateFrame>
    </>
  );
}
