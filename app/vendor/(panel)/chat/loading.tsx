import { Skeleton } from "@/components/states/Skeleton";

/** Chat Box loading: heading, then the two-pane chat card (list rows · thread bubbles). */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading Chat Box" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-48 rounded-md" />
      <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
      <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] overflow-hidden rounded-lg bg-card shadow-sm md:min-h-[32rem] md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:max-h-[52rem]">
        <div className="flex flex-col gap-3 border-line p-4 md:border-r">
          <Skeleton className="h-6 w-28 rounded-sm" />
          <Skeleton className="h-11 rounded-md" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/5 rounded-sm" />
                <Skeleton className="h-3 w-4/5 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 p-5 max-md:hidden">
          <Skeleton className="h-11 w-56 rounded-md" />
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
          <Skeleton className="h-20 w-3/5 rounded-2xl" />
          <Skeleton className="mt-auto h-11 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
