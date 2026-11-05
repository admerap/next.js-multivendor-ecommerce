import { Skeleton } from "@/components/states/Skeleton";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <ReportSkeleton />
    </>
  );
}
