import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** Order details loading state: title, tabs, info cards, one seller block and the totals. */
export default function Loading() {
  return (
    <AccountCard>
      <div role="status" aria-label="Loading your order" className="flex flex-col gap-5">
        <div className="flex justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-60 rounded-sm" />
            <Skeleton className="h-4 w-40 rounded-sm" />
          </div>
          <Skeleton className="size-12 rounded-md" />
        </div>
        <div className="flex gap-3 overflow-hidden border-b border-line pb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-28 shrink-0 rounded-sm" />
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg md:ml-auto md:max-w-95" />
      </div>
    </AccountCard>
  );
}
