"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function ApprovedCouponsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load coupons" description="The marketplace didn't respond. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
