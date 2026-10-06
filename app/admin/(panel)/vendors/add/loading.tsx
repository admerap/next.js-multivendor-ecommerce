import { Skeleton } from "@/components/states/Skeleton";

/** Form skeleton (design: three placeholder cards). */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading form" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-56 rounded-sm" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-11.5 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
