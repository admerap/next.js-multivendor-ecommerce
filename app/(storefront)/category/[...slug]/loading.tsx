import { ListingSkeleton } from "@/components/commerce/listing/ListingParts";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { cn } from "@/lib/utils";

/** Category page loading state: breadcrumb, header card (with its filters), sub-category chips and the product grid. */
export default function Loading() {
  return (
    <main className="pb-4">
      <div className={cn(pageContainer, "pt-6")}>
        <Skeleton className="mb-4 h-4 w-56 rounded-sm" />
        <Skeleton className="h-44 w-full rounded-lg lg:h-40" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <div className={cn(pageContainer, "pt-6")}>
        <ListingSkeleton label="Loading category" />
      </div>
    </main>
  );
}
