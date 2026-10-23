import { Skeleton } from "@/components/states/Skeleton";
import { CouponFormSkeleton } from "@/components/coupons/CouponFormSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-56 rounded-md" />
      <CouponFormSkeleton />
    </>
  );
}
