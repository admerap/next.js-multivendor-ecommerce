import { Skeleton } from "./Skeleton";

/** Body skeleton for the admin/vendor dashboards (design Loading state): stat tiles, wallet, chart. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <Skeleton className="mb-5 h-5 w-56 rounded-sm" />
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <Skeleton className="h-59 rounded-lg" />
        <div className="grid grid-cols-2 gap-3.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-95 rounded-lg" />
    </div>
  );
}
