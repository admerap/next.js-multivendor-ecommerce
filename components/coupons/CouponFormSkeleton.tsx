import { Skeleton } from "@/components/states/Skeleton";

/** Loading state of the coupon form (vendorcoupon design: one card, 3-column field grid). */
export function CouponFormSkeleton() {
  return (
    <section role="status" aria-label="Loading coupon form" className="flex flex-col gap-4 rounded-lg bg-card p-4 shadow-sm sm:p-6">
      <Skeleton className="h-5 w-44 rounded-sm" />
      <Skeleton className="h-3.5 w-80 max-w-full rounded-sm" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>
    </section>
  );
}
