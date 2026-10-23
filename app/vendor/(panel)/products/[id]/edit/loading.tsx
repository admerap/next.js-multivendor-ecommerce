import { Skeleton } from "@/components/states/Skeleton";
import { ProductFormSkeleton } from "@/components/vendor/products/form/ProductFormSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <ProductFormSkeleton />
    </>
  );
}
