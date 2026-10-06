import { BrandsSkeleton } from "@/components/admin/brands/BrandsSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-52 rounded-md" />
      <BrandsSkeleton />
    </>
  );
}
