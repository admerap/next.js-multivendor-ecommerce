import { Skeleton } from "@/components/states/Skeleton";
import { CouponFormSkeleton } from "@/components/coupons/CouponFormSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-64 rounded-md" />
      <CouponFormSkeleton />
    </>
  );
}
