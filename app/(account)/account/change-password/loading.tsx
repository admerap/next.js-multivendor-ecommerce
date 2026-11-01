import { AccountCard } from "@/components/account/AccountCard";
import { Skeleton } from "@/components/states/Skeleton";

/** Change Password loading state: title, the two-column fields and the button. */
export default function Loading() {
  return (
    <AccountCard>
    <div role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56 rounded-sm" />
      <Skeleton className="mt-2.5 mb-8 h-4 w-80 max-w-full rounded-sm" />
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={i === 0 ? "flex flex-col gap-2 sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]" : "flex flex-col gap-2"}>
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 ml-auto h-12 w-36 rounded-md" />
    </div>
    </AccountCard>
  );
}
