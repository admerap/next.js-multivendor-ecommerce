"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AddCouponError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this page" description="Something went wrong reaching your store data. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
