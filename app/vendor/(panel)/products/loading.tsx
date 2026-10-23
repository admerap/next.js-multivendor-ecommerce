import { Skeleton } from "@/components/states/Skeleton";
import { ProductsSkeleton } from "@/components/products/ProductsSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <ProductsSkeleton />
    </>
  );
}
