import { Skeleton } from "@/components/states/Skeleton";

/** Loading state of the product details page: overview (gallery + facts) and two content cards. */
export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="flex flex-col gap-5">
      <Skeleton className="h-12 rounded-md" />
      <section className="grid gap-5 rounded-lg bg-card p-4 shadow-sm sm:p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3.5 w-1/3 rounded-sm" />
          <Skeleton className="h-8 w-3/4 rounded-sm" />
          <Skeleton className="h-6 w-1/2 rounded-full" />
          <Skeleton className="h-28 rounded-lg" />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-15 rounded-md" />
            ))}
          </div>
        </div>
      </section>
      {Array.from({ length: 2 }, (_, i) => (
        <section key={i} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm sm:p-6">
          <Skeleton className="h-6 w-48 rounded-sm" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-5/6 rounded-sm" />
        </section>
      ))}
    </div>
  );
}
