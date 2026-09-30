"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminDashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState
        title="Couldn't load marketplace analytics"
        description="We couldn't reach the analytics service. Check your connection and try again."
        onRetry={reset}
      />
    </div>
  );
}
