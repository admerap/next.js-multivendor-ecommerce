import { OrdersSkeleton } from "@/components/account/orders/OrdersSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-5 h-8 w-48 rounded-sm" />
      <OrdersSkeleton />
    </>
  );
}
