import { Skeleton } from "@/components/states/Skeleton";

/** Profile Info body skeleton (user.dashboard design, Loading state). */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading your profile">
      <div className="mt-4 mb-8 flex flex-col items-center gap-3.5">
        <Skeleton className="size-30 rounded-full" />
        <Skeleton className="h-4.5 w-36 rounded-sm" />
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-2/5 rounded-sm" />
            <Skeleton className="h-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
