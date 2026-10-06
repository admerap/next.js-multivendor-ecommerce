import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pagination } from "@/components/admin/brands/Pagination";
import { ListPageHeading } from "@/components/admin/categories/ListPageHeading";
import { ListSkeleton } from "@/components/admin/categories/ListSkeleton";
import { ListToolbar } from "@/components/admin/categories/ListToolbar";
import { NoMatches } from "@/components/admin/categories/NoMatches";
import { VendorApprovalTable } from "@/components/admin/vendors/VendorApprovalTable";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { requireArea } from "@/lib/auth-guard";
import { vendorListSchema } from "@/lib/validations/admin-vendor";
import { getVendors } from "../actions";

export const metadata: Metadata = { title: "Vendor Approval" };

const emptyState = (
  <EmptyState
    bare
    icon={ClipboardCheck}
    title="No pending vendors"
    description="New store applications from Sell on Sundry appear here for review. You're all caught up."
  />
);

/** Pending applications only: search + page size (the status is always Pending). */
function ListCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar searchLabel="Search by store, owner or email" statuses={null} />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

export default async function VendorApprovalPage({ searchParams }: PageProps<"/admin/vendors/approval">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const raw = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const params = vendorListSchema.parse(raw);

  const res = await getVendors(params, "PENDING");
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load pending vendors"); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Vendor Manage" }, { label: "Vendor Approval" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={ClipboardCheck} title="Vendor Approval" total={total} noun="pending vendors" />}
        loading={<ListSkeleton label="Loading pending vendors" />}
        empty={<ListCard>{emptyState}</ListCard>}
        error={{ title: "Couldn't load pending vendors", description: "Something went wrong reaching the marketplace. Check your connection and try again." }}
      >
        <ListCard>
          {total === 0 && params.q === "" ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <VendorApprovalTable items={items} offset={(page - 1) * pageSize} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                noun="pending vendors"
                params={{ q: params.q || undefined, pageSize: pageSize === 10 ? undefined : String(pageSize) }}
              />
            </>
          ) : (
            <NoMatches noun="pending vendors" q={params.q} />
          )}
        </ListCard>
      </PreviewStateFrame>
    </>
  );
}
