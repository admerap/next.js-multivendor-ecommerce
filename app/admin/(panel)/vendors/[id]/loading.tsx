import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading vendor" className="flex flex-col gap-6">
      <div className="flex items-center gap-5 rounded-lg bg-card p-6 shadow-sm">
        <Skeleton className="size-24 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-56 rounded-sm" />
          <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
        </div>
        <Skeleton className="hidden h-11.5 w-56 rounded-md sm:block" />
      </div>
      <Skeleton className="h-24 rounded-lg sm:w-1/2 xl:w-1/3" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
