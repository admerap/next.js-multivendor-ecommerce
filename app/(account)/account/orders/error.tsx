"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function OrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load your orders" description="Something went wrong fetching your orders. Please try again." onRetry={reset} />
    </div>
  );
}
