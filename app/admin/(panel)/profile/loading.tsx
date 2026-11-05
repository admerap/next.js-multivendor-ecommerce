import { Skeleton } from "@/components/states/Skeleton";

/** Admin › Profile: heading, then the summary card (banner + photo) beside the card whose header is the tabs. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your profile" className="flex flex-col gap-5">
      <Skeleton className="h-10 w-56 rounded-md" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section className="self-start overflow-hidden rounded-lg bg-card shadow-sm">
          <Skeleton className="h-28 rounded-none" />
          <div className="flex flex-col items-center gap-3 px-6 pb-6">
            <Skeleton className="-mt-14 size-28 rounded-full ring-4 ring-card" />
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-5 w-32 rounded-full" />
            {Array.from({ length: 2 }, (_, k) => (
              <Skeleton key={k} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </section>
        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex gap-2 border-b border-line px-5 py-3.5 sm:px-7">
            <Skeleton className="h-11 flex-1 rounded-full sm:w-48 sm:flex-none" />
            <Skeleton className="h-11 flex-1 rounded-full sm:w-44 sm:flex-none" />
          </div>
          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
            {Array.from({ length: 6 }, (_, k) => (
              <Skeleton key={k} className="h-12 rounded-md" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
