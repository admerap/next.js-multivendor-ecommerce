import { Skeleton } from "@/components/states/Skeleton";

/** My Order loading state: controls, pills and three order cards. */
export function OrdersSkeleton() {
  return (
    <div role="status" aria-label="Loading your orders" className="flex flex-col gap-4">
      <div className="flex gap-2.5">
        <Skeleton className="h-11 flex-1 rounded-md sm:max-w-80" />
        <Skeleton className="h-11 w-40 rounded-md" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex items-start gap-4 p-5">
            <Skeleton className="size-15 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48 rounded-sm" />
              <Skeleton className="h-4 w-64 max-w-full rounded-sm" />
              <Skeleton className="h-3.5 w-32 rounded-sm" />
            </div>
            <Skeleton className="h-8 w-24 rounded-sm" />
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line bg-sunken px-5 py-3.5">
            <Skeleton className="h-11 w-32 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
