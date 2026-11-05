import { Skeleton } from "@/components/states/Skeleton";

/** Loading state shared by the three reports: filter card, stats + chart row, table rows. */
export function ReportSkeleton() {
  return (
    <div role="status" aria-label="Loading report" className="flex flex-col gap-5">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <Skeleton className="mb-4 h-6 w-32 rounded-md" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11.5 flex-[1_1_200px] rounded-md" />
          <Skeleton className="h-11.5 flex-[1_1_200px] rounded-md" />
          <Skeleton className="h-11.5 w-56 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)_minmax(250px,1fr)]">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg lg:col-span-2 xl:col-span-1" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-sm">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    </div>
  );
}
