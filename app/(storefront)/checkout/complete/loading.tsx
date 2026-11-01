import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { cn } from "@/lib/utils";

/** Confirmation loading state: the design card, then the order details. */
export default function Loading() {
  return (
    <main role="status" aria-label="Loading your order" className="pb-4">
      <div className={cn(pageContainer, "max-w-160 pt-[clamp(32px,6vw,56px)]")}>
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card px-10 py-12 shadow-lg">
          <Skeleton className="size-22 rounded-full" />
          <Skeleton className="h-8 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-14 w-full max-w-105 rounded-full" />
          <Skeleton className="h-12.5 w-full rounded-md" />
        </div>
      </div>
      <div className={cn(pageContainer, "max-w-200 pt-10")}>
        <Skeleton className="mb-4 h-7 w-48 rounded-md" />
        <Skeleton className="h-60 w-full rounded-lg" />
      </div>
    </main>
  );
}
