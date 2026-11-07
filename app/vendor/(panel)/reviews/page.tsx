import { Package, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/data/DashCard";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListSkeleton } from "@/components/data/ListSkeleton";
import { ListToolbar, type ToolbarFilter } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { Pagination } from "@/components/data/Pagination";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { VendorReviewTable } from "@/components/vendor/reviews/VendorReviewTable";
import { requireArea } from "@/lib/auth-guard";
import { firstParams } from "@/lib/list-params";
import { listVendorReviews } from "@/lib/vendor-reviews.server";
import { VENDOR_REVIEW_STATUS_LABEL, VENDOR_REVIEW_STATUSES, vendorReviewListSchema } from "@/lib/validations/vendor-review";

export const metadata: Metadata = { title: "Product Reviews" };

const STATUSES = VENDOR_REVIEW_STATUSES.map((value) => ({ value, label: VENDOR_REVIEW_STATUS_LABEL[value] }));
const RATING: ToolbarFilter = {
  param: "rating",
  label: "Filter by rating",
  allLabel: "Any rating",
  options: ["5", "4", "3", "2", "1"].map((id) => ({ id, label: `${id} star${id === "1" ? "" : "s"}` })),
};
const REPLY: ToolbarFilter = {
  param: "reply",
  label: "Filter by reply",
  allLabel: "Replied or not",
  options: [
    { id: "unreplied", label: "Not replied" },
    { id: "replied", label: "Replied" },
  ],
};

const emptyState = (
  <EmptyState bare icon={Star} title="No reviews yet" description="When buyers review your products, they will show up here for you to reply to.">
    <Button asChild>
      <Link href="/vendor/products" className="text-on-primary!">
        <Package aria-hidden />
        Go to Product List
      </Link>
    </Button>
  </EmptyState>
);

function ListCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar
        searchLabel="Search by review ID, product, reviewer or text"
        filters={[RATING, REPLY]}
        statuses={STATUSES}
        exportBase="/api/vendor/reviews/export"
      />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

/**
 * Seller Center › Product Manage › Product Reviews (vendorproductreview design): reviews on THIS store's products
 * only — search, status / rating / reply filters, Export, and Reply. The status is read-only: the Sundry team
 * moderates reviews; the store answers them.
 */
export default async function VendorReviewsPage({ searchParams }: PageProps<"/vendor/reviews">) {
  const user = await requireArea("VENDOR");
  const params = vendorReviewListSchema.parse(firstParams(await searchParams));
  const { items, total, storeTotal, page, pageSize, pageCount } = await listVendorReviews(user.vendorId!, params); // throws → error.tsx (Retry)

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Product Manage" }, { label: "Product Reviews" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={Star} title="Product Reviews" total={storeTotal} noun="reviews" />
            <p className="mt-1 text-sm text-fg-muted">Read what buyers say about your products and reply. Reviews are moderated by the Sundry team.</p>
          </div>
        }
        loading={<ListSkeleton label="Loading reviews" withImage />}
        empty={<section className="rounded-lg bg-card shadow-sm">{emptyState}</section>}
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {storeTotal === 0 ? (
          <section className="rounded-lg bg-card shadow-sm">{emptyState}</section>
        ) : (
          <ListCard>
            {items.length > 0 ? (
              <>
                <VendorReviewTable rows={items} offset={(page - 1) * pageSize} />
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  pageSize={pageSize}
                  noun="reviews"
                  params={{
                    q: params.q || undefined,
                    status: params.status === "ALL" ? undefined : params.status,
                    rating: params.rating === "ALL" ? undefined : params.rating,
                    reply: params.reply === "ALL" ? undefined : params.reply,
                    pageSize: pageSize === 10 ? undefined : String(pageSize),
                  }}
                />
              </>
            ) : (
              <NoMatches noun="reviews" q={params.q} />
            )}
          </ListCard>
        )}
      </PreviewStateFrame>
    </>
  );
}
