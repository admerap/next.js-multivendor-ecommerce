import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** My Address: heading, the form (type buttons + fields) and two saved-address cards. */
export default function Loading() {
  return (
    <AccountCard>
      <div role="status" aria-label="Loading your addresses" className="flex flex-col gap-7">
        <Skeleton className="h-9 w-48 rounded-sm" />
        <div className="rounded-lg border border-line p-5 sm:p-6">
          <Skeleton className="mb-5 h-6 w-44 rounded-sm" />
          <div className="mb-4 flex gap-2.5">
            {[0, 1, 2].map((k) => (
              <Skeleton key={k} className="h-11 flex-1 rounded-md" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, k) => (
              <Skeleton key={k} className="h-16 rounded-md" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((k) => (
            <Skeleton key={k} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </AccountCard>
  );
}
