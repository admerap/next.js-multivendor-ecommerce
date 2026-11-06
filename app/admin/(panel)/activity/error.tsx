"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminActivityError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState
        title="Couldn't load the activity log"
        description="Something went wrong loading the activity log. Check your connection and try again."
        onRetry={reset}
      />
    </div>
  );
}
