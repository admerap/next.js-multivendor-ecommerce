import { Skeleton } from "@/components/states/Skeleton";
import { ProductsSkeleton } from "@/components/products/ProductsSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-64 rounded-md" />
      <ProductsSkeleton />
    </>
  );
}
