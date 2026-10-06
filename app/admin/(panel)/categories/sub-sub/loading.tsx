import { ListSkeleton } from "@/components/admin/categories/ListSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-72 rounded-md" />
      <ListSkeleton label="Loading sub-sub-categories" />
    </>
  );
}
