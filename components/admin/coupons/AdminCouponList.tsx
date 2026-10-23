import { CircleCheck, CircleX, Clock3, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getAdminCouponFilters, getAdminCoupons } from "@/app/admin/(panel)/coupons/actions";
import { Pagination } from "@/components/data/Pagination";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { COUPON_STATUS_LABELS, COUPON_STATUSES } from "@/lib/coupons";
import { adminCouponListSchema, type AdminCouponView } from "@/lib/validations/admin-coupon";
import { AdminCouponTable } from "./AdminCouponTable";
import { firstParams } from "@/lib/list-params";

type ViewConfig = { title: string; icon: LucideIcon; noun: string; empty: { title: string; description: string } };

/** Copy of each Coupon Manage list (sidebar order). */
const COUPON_VIEWS: Record<AdminCouponView, ViewConfig> = {
  pending: {
    title: "Pending Coupons",
    icon: Clock3,
    noun: "pending coupons",
    empty: { title: "No coupon requests", description: "When stores create or change coupons, they appear here for review." },
  },
  approved: {
    title: "Approved Coupons",
    icon: CircleCheck,
    noun: "approved coupons",
    empty: { title: "No approved coupons", description: "Coupons you approve appear here and can be used at checkout." },
  },
  denied: {
    title: "Denied Coupons",
    icon: CircleX,
    noun: "denied coupons",
    empty: { title: "No denied coupons", description: "Coupons you deny appear here until the store edits and resubmits them." },
  },
};

const ERROR = { title: "Couldn't load coupons", description: "The marketplace didn't respond. Check your connection and try again." };
const STATUSES = COUPON_STATUSES.map((value) => ({ value, label: COUPON_STATUS_LABELS[value] }));

/**
 * One Coupon Manage list, shared by the three routes: heading with count, search + vendor/status
 * filters + page size, table→cards, pagination, 4 states.
 */
export async function AdminCouponList({ view, searchParams }: { view: AdminCouponView; searchParams: Record<string, string | string[] | undefined> }) {
  const cfg = COUPON_VIEWS[view];
  const params = adminCouponListSchema.parse(firstParams(searchParams));

  const [res, filtersRes] = await Promise.all([getAdminCoupons(params, view), getAdminCouponFilters(view)]);
  if (!res.success || !res.data || !filtersRes.success || !filtersRes.data) throw new Error(res.error ?? filtersRes.error ?? ERROR.title); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;
  const vendors = filtersRes.data.vendors;
  const filtered = params.q !== "" || params.vendor !== "" || params.status !== "ALL";

  const emptyState = <EmptyState bare icon={cfg.icon} title={cfg.empty.title} description={cfg.empty.description} />;
  const card = (children: ReactNode) => (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar
        searchLabel="Search by title or code"
        filters={[{ param: "vendor", label: "Filter by vendor", allLabel: "All vendors", options: vendors }]}
        statuses={STATUSES}
      />
      <div className="border-t border-line">{children}</div>
    </section>
  );

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Coupon Manage" }, { label: cfg.title }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={cfg.icon} title={cfg.title} total={total} noun={cfg.noun} />}
        loading={<ListSkeleton label="Loading coupons" withImage />}
        empty={<section className="rounded-lg bg-card shadow-sm">{emptyState}</section>}
        error={ERROR}
      >
        {total === 0 && !filtered ? (
          <section className="rounded-lg bg-card shadow-sm">{emptyState}</section>
        ) : (
          card(
            items.length > 0 ? (
              <>
                <AdminCouponTable items={items} offset={(page - 1) * pageSize} />
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  pageSize={pageSize}
                  noun={cfg.noun}
                  params={{
                    q: params.q || undefined,
                    vendor: params.vendor || undefined,
                    status: params.status === "ALL" ? undefined : params.status,
                    pageSize: pageSize === 10 ? undefined : String(pageSize),
                  }}
                />
              </>
            ) : (
              <NoMatches noun={cfg.noun} q={params.q} />
            ),
          )
        )}
      </PreviewStateFrame>
    </>
  );
}
