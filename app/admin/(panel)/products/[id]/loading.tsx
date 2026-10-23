import { Skeleton } from "@/components/states/Skeleton";
import { ProductDetailSkeleton } from "@/components/products/detail/ProductDetailSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-64 rounded-md" />
      <ProductDetailSkeleton />
    </>
  );
}
