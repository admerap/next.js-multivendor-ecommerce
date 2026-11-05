import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** Track Order loading state: title, search bar, summary panel and one progress line. */
export default function Loading() {
  return (
    <AccountCard>
      <div role="status" aria-label="Loading tracking" className="flex flex-col gap-5">
        <Skeleton className="h-8 w-48 rounded-sm" />
        <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
        <div className="flex gap-3">
          <Skeleton className="h-13 flex-1 rounded-md" />
          <Skeleton className="h-13 w-32 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex flex-col gap-5 rounded-lg border border-line p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40 rounded-sm" />
                <Skeleton className="h-3.5 w-64 max-w-full rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AccountCard>
  );
}
