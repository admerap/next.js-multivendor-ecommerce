"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorDashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState
        title="Couldn't load your dashboard"
        description="We couldn't reach your store analytics. Check your connection and try again."
        onRetry={reset}
      />
    </div>
  );
}
