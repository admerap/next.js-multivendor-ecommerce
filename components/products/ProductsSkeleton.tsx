import { Skeleton } from "@/components/states/Skeleton";

/** Loading state of the product list: toolbar + product rows (vendorproductlist design). */
export function ProductsSkeleton() {
  return (
    <section role="status" aria-label="Loading products" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 p-4 sm:px-6 sm:py-5">
        <Skeleton className="h-11.5 w-full rounded-md sm:max-w-105" />
        <Skeleton className="h-11.5 w-28 rounded-md sm:ml-auto" />
        <Skeleton className="h-11.5 w-44 rounded-md" />
      </div>
      <Skeleton className="hidden h-11 rounded-none xl:block" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-4 sm:px-6">
          <Skeleton className="hidden h-4 w-6 rounded-sm xl:block" />
          <Skeleton className="size-13 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-sm" />
            <Skeleton className="h-3 w-1/4 rounded-sm" />
          </div>
          <Skeleton className="hidden h-4 w-20 rounded-sm xl:block" />
          <Skeleton className="hidden h-6 w-11 rounded-full xl:block" />
          <Skeleton className="hidden h-9 w-30 rounded-md sm:block" />
        </div>
      ))}
    </section>
  );
}
