import { ListSkeleton } from "@/components/data/ListSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <div className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
        <Skeleton className="mb-4 h-6 w-52 rounded-md" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-17 rounded-md" />
          ))}
        </div>
      </div>
      <ListSkeleton label="Loading orders" />
    </>
  );
}
