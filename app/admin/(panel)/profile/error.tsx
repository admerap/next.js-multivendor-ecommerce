"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminProfileError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState
        title="Couldn't load your profile"
        description="Something went wrong loading your profile. Check your connection and try again."
        onRetry={reset}
      />
    </div>
  );
}
