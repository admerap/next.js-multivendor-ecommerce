import { Skeleton } from "@/components/states/Skeleton";

/** Admin › Settings › Tax Rates loading state: search bar and rows. */
export function TaxRatesSkeleton() {
  return (
    <div role="status" aria-label="Loading tax rates" className="rounded-lg bg-card shadow-sm">
      <div className="border-b border-line p-6">
        <Skeleton className="h-11 w-80 max-w-full rounded-md" />
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-b-0">
          <Skeleton className="h-4 w-40 rounded-sm" />
          <Skeleton className="ml-auto h-11 w-36 rounded-md" />
          <Skeleton className="h-6 w-11 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}
