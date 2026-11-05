import { Skeleton } from "@/components/states/Skeleton";
import { TaxRatesSkeleton } from "@/components/admin/settings/TaxRatesSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-9 h-10 w-56 rounded-md" />
      <TaxRatesSkeleton />
    </>
  );
}
