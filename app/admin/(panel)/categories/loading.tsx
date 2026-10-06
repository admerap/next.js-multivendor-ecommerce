import { ListSkeleton } from "@/components/admin/categories/ListSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <ListSkeleton label="Loading categories" withImage />
    </>
  );
}
