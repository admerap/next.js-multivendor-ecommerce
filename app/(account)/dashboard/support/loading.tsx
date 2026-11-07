import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** Support Ticket: heading + button, then the ticket rows. */
export default function Loading() {
  return (
    <AccountCard>
      <div role="status" aria-label="Loading your tickets">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-56 rounded-sm" />
          <Skeleton className="h-11 w-40 rounded-md" />
        </div>
        <Skeleton className="mb-2 h-11 rounded-md max-xl:hidden" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, k) => (
            <Skeleton key={k} className="h-16 rounded-md max-xl:h-28" />
          ))}
        </div>
      </div>
    </AccountCard>
  );
}
