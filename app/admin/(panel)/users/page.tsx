import { Trash2, UserCog } from "lucide-react";
import type { Metadata } from "next";
import { AdminUserTable } from "@/components/admin/users/AdminUserTable";
import { NewUserButton } from "@/components/admin/users/UserFormDialog";
import { EmptyState } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportTabs } from "@/components/reports/ReportKit";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { getAccess, requirePermission } from "@/lib/access.server";
import { assignableRoles } from "@/lib/admin-roles.server";
import { listAdminUsers } from "@/lib/admin-users.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { adminUserListSchema } from "@/lib/validations/admin-user";

export const metadata: Metadata = { title: "Users" };

const PATH = "/admin/users";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the users. Check your connection and try again." };
const noUsers = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={UserCog} title="No users yet" description="The people who run the admin panel appear here." />
  </section>
);
const noDeleted = <EmptyState bare icon={Trash2} title="No deleted users" description="Users you delete show up here, and you can restore them any time." />;

/**
 * Admin › Users › Users: the people who run the admin panel (staff), with their photo, role and status. Customers
 * and vendors have their own lists. Search, page and the Users / Deleted view live in the URL; deleted users are
 * soft-deleted and can be restored from the Deleted view.
 */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requirePermission("users");
  const params = adminUserListSchema.parse(firstParams(await searchParams));
  // The role decides: New User needs Users › Create, Edit › Update, Delete / Restore › Delete. Anyone but a Super Admin
  // sees no Super Admins and can't touch an account with more access than theirs (the actions enforce it too).
  const access = (await getAccess())!; // requirePermission passed, so there is one
  const perms = access.permissions.users;
  const [data, roles] = await Promise.all([listAdminUsers(params, { viewer: access }), assignableRoles(access)]); // throws → error.tsx (Retry)
  const deletedView = params.view === "deleted";
  const view = { q: params.q || undefined, view: deletedView ? "deleted" : undefined };
  const tabs = [
    { label: `Users (${data.staff})`, href: PATH, current: !deletedView },
    { label: `Deleted (${data.deleted})`, href: `${PATH}?view=deleted`, current: deletedView },
  ];
  const nothing = deletedView ? data.deleted === 0 : data.staff === 0;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Users" }, { label: "Users" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={UserCog} title="Users" total={data.staff} noun="users" />
            <p className="mt-1 text-sm text-fg-muted">The people who run the admin panel. Customers and vendors have their own lists.</p>
          </div>
        }
        actions={perms.create ? <NewUserButton roles={roles} /> : undefined}
        loading={<ListSkeleton label="Loading users" />}
        empty={noUsers}
        error={ERROR}
      >
        <div className="flex flex-col gap-4">
          {(data.deleted > 0 || deletedView) && <ReportTabs label="User views" tabs={tabs} />}
          {nothing && !deletedView ? (
            noUsers
          ) : (
            <section aria-labelledby="user-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="user-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                  {deletedView ? "Deleted users" : "User list"}
                  <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
                </h2>
                {!nothing && <SearchForm action={PATH} q={params.q} placeholder="Search by name, email or phone" keep={{ view: view.view }} />}
                {!deletedView && <ExportMenu href={withQuery("/api/admin/users/export", { q: view.q })} />}
              </div>
              <div className="border-t border-line">
                {nothing ? (
                  noDeleted
                ) : data.rows.length > 0 ? (
                  <>
                    <AdminUserTable
                      rows={data.rows}
                      offset={(data.page - 1) * data.pageSize}
                      viewer={{ id: me.id, canUpdate: perms.update, canDelete: perms.delete, isSuper: access.isSuper }}
                      roles={roles}
                    />
                    <Pagination
                      page={data.page}
                      pageCount={data.pageCount}
                      total={data.total}
                      pageSize={data.pageSize}
                      noun="users"
                      params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                    />
                  </>
                ) : (
                  <NoMatches noun="users" q={params.q} />
                )}
              </div>
            </section>
          )}
        </div>
      </PreviewStateFrame>
    </>
  );
}
