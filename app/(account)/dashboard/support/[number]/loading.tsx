import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** Ticket details: back link, subject + badges, two messages, the reply box. */
export default function Loading() {
  return (
    <AccountCard>
      <div role="status" aria-label="Loading the ticket">
        <Skeleton className="mb-4 h-5 w-28 rounded-sm" />
        <Skeleton className="mb-2 h-4 w-24 rounded-sm" />
        <Skeleton className="mb-3 h-8 w-3/4 rounded-sm" />
        <Skeleton className="mb-7 h-6 w-72 rounded-full" />
        <div className="mb-7 flex flex-col gap-4">
          <Skeleton className="h-28 w-full max-w-160 rounded-lg" />
          <Skeleton className="h-20 w-full max-w-120 self-end rounded-lg" />
        </div>
        <Skeleton className="h-32 rounded-md" />
      </div>
    </AccountCard>
  );
}
