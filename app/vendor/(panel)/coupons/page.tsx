import { Plus, TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pagination } from "@/components/data/Pagination";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar, type ToolbarFilter } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { CouponTable } from "@/components/vendor/coupons/CouponTable";
import { requireArea } from "@/lib/auth-guard";
import { COUPON_STATUS_LABELS, COUPON_STATUSES } from "@/lib/coupons";
import { couponListSchema } from "@/lib/validations/coupon";
import { APPROVAL_LABELS, APPROVAL_STATUSES } from "@/lib/validations/product";
import { getVendorCoupons } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Coupon List" };

const STATUSES = COUPON_STATUSES.map((value) => ({ value, label: COUPON_STATUS_LABELS[value] }));
/** Approval filter (only approved coupons apply at checkout) — same wording as the product list. */
const APPROVAL: ToolbarFilter = {
  param: "approval",
  label: "Filter by approval",
  allLabel: "All approvals",
  options: APPROVAL_STATUSES.map((id) => ({ id, label: APPROVAL_LABELS[id] })),
};

/** "+ Add Coupon" — top-right of the heading, like the other lists. */
const addCoupon = (
  <Button asChild>
    <Link href="/vendor/coupons/add" className="!text-on-primary">
      <Plus aria-hidden />
      Add Coupon
    </Link>
  </Button>
);

const emptyState = (
  <EmptyState bare icon={TicketPercent} title="No coupons yet" description="Create a coupon to reward loyal buyers or waive shipping. Once the Sundry team approves it, it goes live on your store when its start date arrives.">
    {addCoupon}
  </EmptyState>
);

function ListCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar searchLabel="Search by title or code" filters={[APPROVAL]} statuses={STATUSES} />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

/** Seller Center › Coupon Manage › Coupon List — the LIST half of the vendorcoupon design. Only this vendor's coupons. */
export default async function CouponListPage({ searchParams }: PageProps<"/vendor/coupons">) {
  await requireArea("VENDOR");
  const sp = await searchParams;
  const params = couponListSchema.parse(firstParams(sp));

  const res = await getVendorCoupons(params);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load coupons"); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL" || params.approval !== "ALL";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Coupon Manage" }, { label: "Coupon List" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={TicketPercent} title="Coupon List" total={total} noun="coupons" />}
        actions={addCoupon}
        loading={<ListSkeleton label="Loading coupons" withImage />}
        empty={<section className="rounded-lg bg-card shadow-sm">{emptyState}</section>}
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {total === 0 && !filtered ? (
          <section className="rounded-lg bg-card shadow-sm">{emptyState}</section>
        ) : (
          <ListCard>
            {items.length > 0 ? (
              <>
                <CouponTable items={items} offset={(page - 1) * pageSize} />
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  pageSize={pageSize}
                  noun="coupons"
                  params={{
                    q: params.q || undefined,
                    status: params.status === "ALL" ? undefined : params.status,
                    approval: params.approval === "ALL" ? undefined : params.approval,
                    pageSize: pageSize === 10 ? undefined : String(pageSize),
                  }}
                />
              </>
            ) : (
              <NoMatches noun="coupons" q={params.q} />
            )}
          </ListCard>
        )}
      </PreviewStateFrame>
    </>
  );
}
