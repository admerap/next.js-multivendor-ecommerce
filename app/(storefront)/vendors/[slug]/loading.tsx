import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { cn } from "@/lib/utils";

/** Store page loading state: breadcrumb, cover + store card, toolbar with its filter row and a product grid. */
export default function Loading() {
  return (
    <main role="status" aria-label="Loading store" className="pb-4">
      <div className={cn(pageContainer, "pt-6")}>
        <Skeleton className="mb-4 h-4 w-56 rounded-sm" />
        <Skeleton className="h-[clamp(160px,22vw,280px)] w-full rounded-xl" />
        <div className="relative z-10 mx-[clamp(12px,3vw,32px)] -mt-13 flex max-w-140 items-center gap-4 rounded-lg bg-card px-5 py-4.5 shadow-md">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2 rounded-sm" />
            <Skeleton className="h-3.5 w-3/4 rounded-sm" />
          </div>
        </div>
        <Skeleton className="mt-5 h-34 w-full rounded-lg" />
      </div>
      <div className={cn(pageContainer, "pt-6")}>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(230px,calc(50%_-_10px)),1fr))] gap-[clamp(12px,2vw,20px)]">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
