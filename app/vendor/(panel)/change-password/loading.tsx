import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading password settings" className="flex flex-col gap-5">
      <Skeleton className="h-10 w-64 rounded-md" />
      <Skeleton className="h-11 w-72 max-w-full rounded-full" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
