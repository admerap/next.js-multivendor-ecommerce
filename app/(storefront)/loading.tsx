import { ProductGridSkeleton } from "@/components/home/HomeSection";
import { Skeleton } from "@/components/states/Skeleton";

/** Home loading state: hero block + a product row (sections then stream in on their own). */
export default function Loading() {
  return (
    <main className="flex flex-col pb-4">
      <div role="status" aria-label="Loading" className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-7">
        <Skeleton className="h-[clamp(320px,40vw,440px)] w-full rounded-xl" />
      </div>
      <ProductGridSkeleton label="Loading products" />
    </main>
  );
}
