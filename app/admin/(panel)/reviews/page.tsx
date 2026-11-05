import { MessageSquareText, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminReviewTable } from "@/components/admin/reviews/AdminReviewTable";
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
import { listAdminReviews } from "@/lib/admin-reviews.server";
import { firstParams, withQuery } from "@/lib/list-params";
import { cn } from "@/lib/utils";
import { ADMIN_REVIEW_STATUS_LABEL, adminReviewListSchema, REVIEW_STATUS_SLUGS, type ReviewStatusSlug } from "@/lib/validations/admin-review";

export const metadata: Metadata = { title: "Customer Reviews" };

const PATH = "/admin/reviews";
const ERROR = { title: "Couldn't load this page", description: "Something went wrong loading the reviews. Check your connection and try again." };
const noReviews = (
  <section className="rounded-lg bg-card shadow-sm">
    <EmptyState bare icon={MessageSquareText} title="No reviews yet" description="Reviews customers leave after delivery appear here for moderation." />
  </section>
);
const TABS: { slug: ReviewStatusSlug | undefined; label: string }[] = [
  { slug: undefined, label: "All" },
  { slug: "pending", label: ADMIN_REVIEW_STATUS_LABEL.PENDING },
  { slug: "approved", label: ADMIN_REVIEW_STATUS_LABEL.APPROVED },
  { slug: "denied", label: ADMIN_REVIEW_STATUS_LABEL.REJECTED },
];

/**
 * Admin › Review Manage › Customer Review (admincustomerreview design): every product review on the
 * platform — status tabs, search, Filter (rating, store, visibility), Export, pagination. Moderation
 * happens on each review's page.
 */
export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requirePermission("reviews");
  const params = adminReviewListSchema.parse(firstParams(await searchParams));
  const data = await listAdminReviews(params); // throws → error.tsx (Retry)
  const panel = { rating: params.rating ? String(params.rating) : undefined, store: params.store, visibility: params.visibility };
  const view = { status: params.status, q: params.q || undefined, ...panel };
  const filtered = !!(params.q || params.rating || params.store || params.visibility);
  const all = data.counts.PENDING + data.counts.APPROVED + data.counts.REJECTED;

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Review Manage" }, { label: "Customer Review" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={
          <div>
            <ListPageHeading icon={Star} title="Customer Reviews" total={data.platformTotal} noun="reviews" />
            <p className="mt-1 text-sm text-fg-muted">Moderate product reviews across every store, and hide what breaks the rules.</p>
          </div>
        }
        loading={<ListSkeleton label="Loading reviews" withImage />}
        empty={noReviews}
        error={ERROR}
      >
        {data.platformTotal === 0 ? (
          noReviews
        ) : (
          <section aria-labelledby="review-list" className="overflow-hidden rounded-lg bg-card shadow-sm">
            <nav aria-label="Review status" className="flex flex-wrap gap-1.5 px-4 pt-4 sm:px-6 sm:pt-5">
              {TABS.map((t) => {
                const count = t.slug ? data.counts[REVIEW_STATUS_SLUGS[t.slug]] : all;
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
                    <span className={cn("rounded-full px-2 text-caption font-bold tabular-nums", on ? "bg-on-primary/20" : t.slug === "pending" && count > 0 ? "bg-saffron-50 text-saffron-700" : "bg-card")}>{count}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
              <h2 id="review-list" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold text-fg-strong">
                Reviews
                <span className="rounded-full bg-iris-50 px-2.5 py-0.5 font-sans text-sm font-bold text-primary tabular-nums">{data.total}</span>
              </h2>
              <SearchForm action={PATH} q={params.q} placeholder="Search by review ID, product or customer" keep={{ ...view, q: undefined }} />
              <ExportMenu href={withQuery("/api/admin/reviews/export", view)} />
              <FilterPanel
                action={PATH}
                fields={[
                  { kind: "select", name: "rating", label: "Rating", anyLabel: "Any rating", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` })) },
                  { kind: "select", name: "store", label: "Store", anyLabel: "All stores", options: data.storeOptions.map((s) => ({ value: s.id, label: s.name })) },
                  {
                    kind: "select",
                    name: "visibility",
                    label: "Visibility",
                    anyLabel: "All reviews",
                    options: [
                      { value: "visible", label: "Published" },
                      { value: "hidden", label: "Hidden" },
                    ],
                  },
                ]}
                values={panel}
                keep={{ status: params.status, q: params.q || undefined }}
              />
            </div>
            <div className="border-t border-line">
              {data.rows.length > 0 ? (
                <>
                  <AdminReviewTable rows={data.rows} />
                  <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} noun="reviews" params={{ ...view, pageSize: params.pageSize === 10 ? undefined : String(params.pageSize) }} />
                </>
              ) : filtered ? (
                <NoMatches noun="reviews" q={params.q} />
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <MessageSquareText aria-hidden className="size-8 text-fg-subtle" strokeWidth={1.6} />
                  <p className="text-sm text-fg-muted">No {params.status ? ADMIN_REVIEW_STATUS_LABEL[REVIEW_STATUS_SLUGS[params.status]].toLowerCase() : ""} reviews right now.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </PreviewStateFrame>
    </>
  );
}
