import { Skeleton } from "@/components/states/Skeleton";

/** Loading state of the add/edit product form: three section cards (vendoraddproduct design). */
export function ProductFormSkeleton() {
  return (
    <div role="status" aria-label="Loading product form" className="flex flex-col gap-5">
      {Array.from({ length: 3 }, (_, i) => (
        <section key={i} className="flex flex-col gap-4 rounded-lg bg-card p-4 shadow-sm sm:p-6">
          <Skeleton className="h-5 w-48 rounded-sm" />
          <Skeleton className="h-3.5 w-72 max-w-full rounded-sm" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, j) => (
              <Skeleton key={j} className="h-12 rounded-md" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
