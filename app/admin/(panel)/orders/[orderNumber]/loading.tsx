import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading order" className="flex flex-col gap-5">
      <Skeleton className="h-10 w-56 rounded-md" />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-sm">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-36 rounded-md" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-md" />
              <Skeleton className="h-4 flex-1 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          ))}
          <Skeleton className="ml-auto h-32 w-full max-w-sm rounded-md" />
        </div>
        <div className="flex flex-col gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
