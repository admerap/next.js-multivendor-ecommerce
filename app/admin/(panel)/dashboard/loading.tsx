import { DashboardSkeleton } from "@/components/states/DashboardSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <div>
        <Skeleton className="h-8 w-56 rounded-sm" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full rounded-sm" />
      </div>
      <DashboardSkeleton />
    </>
  );
}
