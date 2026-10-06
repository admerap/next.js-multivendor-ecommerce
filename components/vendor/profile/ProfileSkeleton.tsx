import { Skeleton } from "@/components/states/Skeleton";

/** Loading skeleton of the profile page: Basic Information card + Store Information card. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-lg bg-card shadow-sm">
        <Skeleton className="h-32 rounded-none sm:h-42" />
        <div className="-mt-14 flex justify-center sm:-mt-17.5">
          <Skeleton className="size-28 rounded-full sm:size-35" />
        </div>
        <div className="grid gap-4.5 px-4 py-6 sm:px-6 md:grid-cols-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-lg bg-card p-4 shadow-sm sm:p-6">
        <Skeleton className="h-6 w-48 rounded-sm" />
        <div className="mt-5 grid gap-4.5 md:grid-cols-2">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </section>
    </div>
  );
}
