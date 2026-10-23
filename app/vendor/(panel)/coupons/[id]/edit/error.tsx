"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function EditCouponError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this coupon" description="Something went wrong reaching your store data. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
