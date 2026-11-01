import { StoreCardSkeleton, storeGridClass } from "@/components/commerce/StoreCard";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { cn } from "@/lib/utils";

/** All Vendors loading state: breadcrumb, hero, filter bar and a grid of store cards. */
export default function Loading() {
  return (
    <main role="status" aria-label="Loading stores" className="pb-4">
      <div className={cn(pageContainer, "pt-6")}>
        <Skeleton className="mb-4 h-4 w-40 rounded-sm" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
      <div className={cn(pageContainer, "pt-5")}>
        <Skeleton className="h-18 w-full rounded-lg" />
      </div>
      <div className={cn(pageContainer, "pt-6")}>
        <div className="min-w-0">
          <Skeleton className="mb-5 h-4 w-32 rounded-sm" />
          <div className={storeGridClass}>
            {Array.from({ length: 6 }, (_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
