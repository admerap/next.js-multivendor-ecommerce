import { Skeleton } from "@/components/states/Skeleton";

/** Brand list loading state: toolbar + table rows (cards on smaller screens). */
export function BrandsSkeleton() {
  return (
    <section role="status" aria-label="Loading brands" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 px-6 py-5">
        <Skeleton className="h-11.5 w-full max-w-105 rounded-md" />
        <Skeleton className="ml-auto h-11.5 w-40 rounded-md" />
        <Skeleton className="h-11.5 w-34 rounded-md" />
      </div>
      <Skeleton className="h-10 rounded-none" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-3.5">
          <Skeleton className="h-4 w-6 rounded-sm" />
          <Skeleton className="size-13 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-sm" />
          <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-30 rounded-md" />
        </div>
      ))}
    </section>
  );
}
