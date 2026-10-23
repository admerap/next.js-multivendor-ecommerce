import { Plus, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pagination } from "@/components/data/Pagination";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { VendorListTable } from "@/components/admin/vendors/VendorListTable";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth-guard";
import { VENDOR_SORT_LABELS, VENDOR_SORTS, vendorListSchema } from "@/lib/validations/admin-vendor";
import { getVendors } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Vendor List" };

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
];
const SORTS = VENDOR_SORTS.map((value) => ({ value, label: VENDOR_SORT_LABELS[value] }));

const addVendor = (
  <Button asChild>
    <Link href="/admin/vendors/add" className="!text-on-primary">
      <Plus aria-hidden />
      Add New Vendor
    </Link>
  </Button>
);

const emptyState = (
  <EmptyState bare icon={Store} title="No vendors yet" description="When sellers register or you add a store, they appear here with their status, products and orders.">
    {addVendor}
  </EmptyState>
);

/** Search + status + sort + page size, then the body (adminvendorlist design). "Add New Vendor" sits in the heading. */
function ListCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar searchLabel="Search by shop or vendor name" statuses={STATUSES} sorts={SORTS} />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

/** Admin › Vendor Manage › Vendor List: every vendor account, any status. Details → /admin/vendors/[id]. */
export default async function VendorListPage({ searchParams }: PageProps<"/admin/vendors">) {
  await requireArea("ADMIN");
  const sp = await searchParams;
  const params = vendorListSchema.parse(firstParams(sp));

  const res = await getVendors(params);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load vendors"); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Vendor Manage" }, { label: "Vendor List" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={Store} title="Vendor List" total={total} noun="vendors" />}
        actions={addVendor}
        loading={<ListSkeleton label="Loading vendors" withImage />}
        empty={<ListCard>{emptyState}</ListCard>}
        error={{ title: "Couldn't load vendors", description: "Something went wrong reaching the marketplace. Check your connection and try again." }}
      >
        <ListCard>
          {total === 0 && !filtered ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <VendorListTable items={items} offset={(page - 1) * pageSize} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                noun="vendors"
                params={{
                  q: params.q || undefined,
                  status: params.status === "ALL" ? undefined : params.status,
                  sort: params.sort === "newest" ? undefined : params.sort,
                  pageSize: pageSize === 10 ? undefined : String(pageSize),
                }}
              />
            </>
          ) : (
            <NoMatches noun="vendors" q={params.q} />
          )}
        </ListCard>
      </PreviewStateFrame>
    </>
  );
}
