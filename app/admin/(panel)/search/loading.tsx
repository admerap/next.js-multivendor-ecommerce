import { Skeleton } from "@/components/states/Skeleton";

/** Admin › Search: heading, then result groups. */
export default function Loading() {
  return (
    <div role="status" aria-label="Searching" className="flex flex-col gap-5">
      <Skeleton className="h-10 w-72 rounded-md" />
      <Skeleton className="h-5 w-96 max-w-full rounded-md" />
      <div className="grid gap-5 xl:grid-cols-2">
        {[0, 1].map((g) => (
          <section key={g} className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Skeleton className="h-13 rounded-none" />
            <div className="flex flex-col gap-3 p-5">
              {Array.from({ length: 3 }, (_, k) => (
                <Skeleton key={k} className="h-11 rounded-md" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
