import { Inbox, LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminTicketTable } from "@/components/admin/support/AdminTicketTable";
import { EmptyState } from "@/components/data/DashCard";
import { ExportMenu } from "@/components/data/ExportMenu";
import { FilterPanel } from "@/components/data/FilterPanel";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SearchForm } from "@/components/data/SearchForm";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requirePermission } from "@/lib/access.server";
import { listAdminTickets } from "@/lib/admin-support.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { cn } from "@/lib/utils";
import { adminTicketListSchema, TICKET_STATUS_SLUGS, type TicketStatusSlug } from "@/lib/validations/admin-support";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_TYPE_LABEL, TICKET_TYPES } from "@/lib/validations/support";

export const metadata: Metadata = { title: "Support Tickets" };

const PATH = "/admin/support";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the support tickets. Check your connection and try again." };
const noTickets = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState
      bare
      icon={LifeBuoy}
      title="No support tickets yet"
      description="Tickets customers open from their account (Support Ticket) appear here for your team to answer."
    />
  </section>
);
const TABS: { slug: TicketStatusSlug | undefined; label: string }[] = [
  { slug: undefined, label: "All" },
  ...(Object.keys(TICKET_STATUS_SLUGS) as TicketStatusSlug[]).map((slug) => ({ slug, label: TICKET_STATUS_LABEL[TICKET_STATUS_SLUGS[slug]] })),
];

/**
 * Admin › Support Tickets: every customer's tickets — status tabs (Open = waiting on staff), search, Filter
 * (priority, type), Export, pagination. Replies and status changes happen on each ticket's page.
 */
export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/support">) {
  await requirePermission("support");
  const params = adminTicketListSchema.parse(firstParams(await searchParams));
  const data = await listAdminTickets(params); // throws → error.tsx (Retry)
  const panel = { priority: params.priority, type: params.type };
  const view = { status: params.status, q: params.q || undefined, ...panel };
  const filtered = !!(params.q || params.priority || params.type);
  const all = Object.values(data.counts).reduce((a, n) => a + n, 0);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Support Tickets" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={LifeBuoy} title="Support Tickets" total={data.platformTotal} noun="tickets" />
            <p className="mt-1 text-sm text-fg-muted">Answer customers&apos; questions and problems. Open tickets are waiting on your team.</p>
          </div>
        }
        loading={<ListSkeleton label="Loading tickets" />}
        empty={noTickets}
        error={ERROR}
      >
        {data.platformTotal === 0 ? (
          noTickets
        ) : (
          <section aria-labelledby="ticket-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
            <nav aria-label="Ticket status" className="flex flex-wrap gap-1.5 px-4 pt-4 sm:px-6 sm:pt-5">
              {TABS.map((t) => {
                const count = t.slug ? data.counts[TICKET_STATUS_SLUGS[t.slug]] : all;
                const on = params.status === t.slug;
                return (
                  <Link
                    key={t.label}
                    href={withQuery(PATH, { ...view, status: t.slug, page: undefined })}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-md px-3.5 text-sm font-semibold transition-colors duration-(--dur-fast)",
                      on ? "bg-primary !text-on-primary shadow-primary" : "bg-sunken !text-fg-muted hover:!text-primary",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-2 text-caption font-bold tabular-nums",
                        on ? "bg-on-primary/20" : t.slug === "open" && count > 0 ? "bg-saffron-50 text-saffron-700" : "bg-card",
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
              <h2 id="ticket-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                Tickets
                <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
              </h2>
              <SearchForm action={PATH} q={params.q} placeholder="Search by ticket number, subject or customer" keep={{ ...view, q: undefined }} />
              <ExportMenu href={withQuery("/api/admin/support/export", view)} />
              <FilterPanel
                action={PATH}
                fields={[
                  {
                    kind: "select",
                    name: "priority",
                    label: "Priority",
                    anyLabel: "Any priority",
                    options: TICKET_PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY_LABEL[p] })),
                  },
                  {
                    kind: "select",
                    name: "type",
                    label: "Type",
                    anyLabel: "All types",
                    options: TICKET_TYPES.map((t) => ({ value: t, label: TICKET_TYPE_LABEL[t] })),
                  },
                ]}
                values={panel}
                keep={{ status: params.status, q: params.q || undefined }}
              />
            </div>
            <div className="border-t border-line">
              {data.rows.length > 0 ? (
                <>
                  <AdminTicketTable rows={data.rows} />
                  <Pagination
                    page={data.page}
                    pageCount={data.pageCount}
                    total={data.total}
                    pageSize={data.pageSize}
                    noun="tickets"
                    params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }}
                  />
                </>
              ) : filtered ? (
                <NoMatches noun="tickets" q={params.q} />
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <Inbox aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                  <p className="text-sm text-fg-muted">
                    No {params.status ? TICKET_STATUS_LABEL[TICKET_STATUS_SLUGS[params.status]].toLowerCase() : ""} tickets right now.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </PreviewStateFrame>
    </>
  );
}
