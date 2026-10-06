import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading brand" className="flex flex-col gap-6">
      <div className="flex items-center gap-5 rounded-lg bg-card p-6 shadow-sm">
        <Skeleton className="size-24 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48 rounded-sm" />
          <Skeleton className="h-4 w-64 max-w-full rounded-sm" />
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
