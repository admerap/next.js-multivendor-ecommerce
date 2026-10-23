import { ListSkeleton } from "@/components/data/ListSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <ListSkeleton label="Loading coupons" withImage />
    </>
  );
}
