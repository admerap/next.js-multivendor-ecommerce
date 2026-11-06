"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminSearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't search right now" description="Something went wrong while searching. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
