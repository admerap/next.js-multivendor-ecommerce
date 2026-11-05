import { Users } from "lucide-react";
import type { Metadata } from "next";
import { AdminCustomerTable } from "@/components/admin/customers/AdminCustomerTable";
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
import { listAdminCustomers } from "@/lib/admin-customers.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { adminCustomerListSchema, CUSTOMER_SORTS } from "@/lib/validations/admin-customer";

export const metadata: Metadata = { title: "Customer List" };

const PATH = "/admin/customers";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the customers. Check your connection and try again." };
const noCustomers = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={Users} title="No customers yet" description="When shoppers create an account on Sundry, they show up here." />
  </section>
);

/**
 * Admin › Review Manage › Customer List (admincustomerlist design): every shopper account with real
 * order counts and spend — search, Filter (ordered / joined on or after, status, sort), Block / Unblock,
 * Export, pagination.
 */
export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requirePermission("customers");
  const params = adminCustomerListSchema.parse(firstParams(await searchParams));
  const data = await listAdminCustomers(params); // throws → error.tsx (Retry)
  const panel = { ordered: params.ordered, joined: params.joined, status: params.status, sort: params.sort === "newest" ? undefined : params.sort };
  const view = { q: params.q || undefined, ...panel };
  const filtered = !!(params.q || params.ordered || params.joined || params.status);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Review Manage" }, { label: "Customer List" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={Users} title="Customer List" total={data.platformTotal} noun="customers" />
            <p className="mt-1 text-sm text-fg-muted">Shoppers who have an account on Sundry, with their order history.</p>
          </div>
        }
        loading={<ListSkeleton label="Loading customers" />}
        empty={noCustomers}
        error={ERROR}
      >
        {data.platformTotal === 0 ? (
          noCustomers
        ) : (
          <section aria-labelledby="customer-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
              <h2 id="customer-list" className="mr-auto flex flex-wrap items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                Customer list
                <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
                {data.blocked > 0 && <span className="font-sans text-caption font-semibold text-error-600">{data.blocked} blocked</span>}
              </h2>
              <SearchForm action={PATH} q={params.q} placeholder="Search by name, email or phone" keep={{ ...panel }} />
              <ExportMenu href={withQuery("/api/admin/customers/export", view)} />
              <FilterPanel
                action={PATH}
                fields={[
                  { kind: "date", name: "ordered", label: "Ordered on or after" },
                  { kind: "date", name: "joined", label: "Joined on or after" },
                  {
                    kind: "select",
                    name: "status",
                    label: "Customer status",
                    anyLabel: "All customers",
                    options: [
                      { value: "active", label: "Active" },
                      { value: "blocked", label: "Blocked" },
                    ],
                  },
                  { kind: "select", name: "sort", label: "Sort by", anyLabel: CUSTOMER_SORTS.newest, options: (["oldest", "orders", "name"] as const).map((s) => ({ value: s, label: CUSTOMER_SORTS[s] })) },
                ]}
                values={panel}
                keep={{ q: params.q || undefined }}
              />
            </div>
            <div className="border-t border-line">
              {data.rows.length > 0 ? (
                <>
                  <AdminCustomerTable rows={data.rows} offset={(data.page - 1) * data.pageSize} />
                  <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} noun="customers" params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }} />
                </>
              ) : filtered ? (
                <NoMatches noun="customers" q={params.q} />
              ) : null}
            </div>
          </section>
        )}
      </PreviewStateFrame>
    </>
  );
}
