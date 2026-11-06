import { ArrowRight, History } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/data/DashCard";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { ExportMenu } from "@/components/data/ExportMenu";
import { SearchForm } from "@/components/data/SearchForm";
import { ReportTabs } from "@/components/reports/ReportKit";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/access.server";
import { listActivity, type ActivityRow } from "@/lib/admin-audit.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { ACTION_TEXT, activityListSchema } from "@/lib/validations/admin-activity";

export const metadata: Metadata = { title: "Activity Log" };

const PATH = "/admin/activity";
const KIND_TABS = [
  { kind: "all", label: "All" },
  { kind: "users", label: "Users" },
  { kind: "roles", label: "Roles" },
  { kind: "permissions", label: "Permissions" },
] as const;
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const Action = ({ r }: { r: ActivityRow }) => {
  const a = ACTION_TEXT[r.action] ?? { label: r.action, tone: "neutral" as const };
  return <Badge tone={a.tone}>{a.label}</Badge>;
};

/** What changed: "Field: before → after" per line; a dash when the action has no details (e.g. a delete). */
const Changes = ({ r }: { r: ActivityRow }) => {
  const entries = Object.entries(r.changes);
  if (entries.length === 0) return <span className="text-fg-subtle">—</span>;
  return (
    <ul className="flex flex-col gap-1">
      {entries.map(([field, [before, after]]) => (
        <li key={field} className="flex flex-wrap items-center gap-x-1.5 text-caption">
          <span className="font-semibold text-fg-strong">{field}:</span>
          {before !== "—" && <span className="text-fg-muted line-through decoration-fg-subtle">{before}</span>}
          {before !== "—" && <ArrowRight aria-label="changed to" className="size-3 shrink-0 text-fg-subtle" />}
          <span className="font-medium text-fg">{after}</span>
        </li>
      ))}
    </ul>
  );
};

const Who = ({ r }: { r: ActivityRow }) => (
  <span className="block min-w-0">
    <span className="block truncate font-semibold text-fg-strong" title={r.actorName}>
      {r.actorName}
    </span>
    <span className="block truncate text-caption text-fg-muted" title={r.actorEmail}>
      {r.actorEmail}
    </span>
  </span>
);

/**
 * Admin › Users › Activity Log: who did what to staff users and roles, and when — newest first, with what changed
 * (never a password, only that it changed). Filter by kind, search by who or what; all of it lives in the URL.
 * Needs Activity Log › Read.
 */
export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requirePermission("activity");
  const params = activityListSchema.parse(firstParams(await searchParams));
  const data = await listActivity(params); // throws → error.tsx (Retry)
  const view = { kind: params.kind === "all" ? undefined : params.kind, q: params.q || undefined };

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Users" }, { label: "Activity Log" }]} />
      <div className="flex flex-col gap-5">
        <div>
          <ListPageHeading icon={History} title="Activity Log" total={data.all} noun="entries" />
          <p className="mt-1 text-sm text-fg-muted">Who created, edited, deleted or restored users and roles, and who changed permissions.</p>
        </div>

        {data.all === 0 ? (
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState bare icon={History} title="Nothing recorded yet" description="Changes to users, roles and permissions appear here as they happen." />
          </section>
        ) : (
          <>
            <ReportTabs
              label="Activity kinds"
              tabs={KIND_TABS.map((t) => ({
                label: t.label,
                href: withQuery(PATH, { kind: t.kind === "all" ? undefined : t.kind, q: view.q }),
                current: params.kind === t.kind,
              }))}
            />
            <section aria-labelledby="activity-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="activity-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                  Entries
                  <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
                </h2>
                <SearchForm action={PATH} q={params.q} placeholder="Search by who or what" pageSizes={[20, 50, 100]} defaultPageSize={20} />
                <ExportMenu base="/api/admin/activity/export" />
              </div>
              <div className="border-t border-line">
                {data.rows.length === 0 ? (
                  <NoMatches noun="entries" q={params.q} />
                ) : (
                  <>
                    <div className="hidden xl:block">
                      <Table className="table-fixed [&_td]:px-3 [&_td]:align-top [&_th]:px-3">
                        <TableHeader>
                          <tr>
                            <TableHead className="w-[15%]">When</TableHead>
                            <TableHead className="w-[19%]">Who</TableHead>
                            <TableHead className="w-[16%]">Action</TableHead>
                            <TableHead className="w-[20%]">Item</TableHead>
                            <TableHead>Changes</TableHead>
                          </tr>
                        </TableHeader>
                        <TableBody>
                          {data.rows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-caption text-fg-muted tabular-nums">{when(r.createdAt)}</TableCell>
                              <TableCell>
                                <Who r={r} />
                              </TableCell>
                              <TableCell>
                                <Action r={r} />
                              </TableCell>
                              <TableCell className="truncate font-medium text-fg-strong" title={r.entityLabel}>
                                {r.entityLabel}
                              </TableCell>
                              <TableCell>
                                <Changes r={r} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ul role="list" aria-label="Activity" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
                      {data.rows.map((r) => (
                        <li key={r.id} className="rounded-lg border border-line p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Action r={r} />
                            <span className="text-caption text-fg-muted tabular-nums">{when(r.createdAt)}</span>
                          </div>
                          <p className="mt-2 truncate font-semibold text-fg-strong" title={r.entityLabel}>
                            {r.entityLabel}
                          </p>
                          <div className="mt-2">
                            <Changes r={r} />
                          </div>
                          <div className="mt-3 border-t border-line pt-3 text-sm">
                            <Who r={r} />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Pagination
                      page={data.page}
                      pageCount={data.pageCount}
                      total={data.total}
                      pageSize={data.pageSize}
                      noun="entries"
                      params={{ ...view, pageSize: params.pageSize === 20 ? undefined : String(params.pageSize) }}
                    />
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
