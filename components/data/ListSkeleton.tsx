import { Skeleton } from "@/components/states/Skeleton";

/** Loading state for the three category lists: toolbar + table rows. */
export function ListSkeleton({ label, withImage = false }: { label: string; withImage?: boolean }) {
  return (
    <section role="status" aria-label={label} className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 px-6 py-5">
        <Skeleton className="h-11.5 w-full max-w-95 rounded-md" />
        <Skeleton className="ml-auto h-11.5 w-40 rounded-md" />
        <Skeleton className="h-11.5 w-34 rounded-md" />
      </div>
      <Skeleton className="h-10 rounded-none" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-3.5">
          <Skeleton className="h-4 w-6 rounded-sm" />
          {withImage && <Skeleton className="size-13 rounded-md" />}
          <Skeleton className="h-4 w-40 rounded-sm" />
          <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      ))}
    </section>
  );
}
