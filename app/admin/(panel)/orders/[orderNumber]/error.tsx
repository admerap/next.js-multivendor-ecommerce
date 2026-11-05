"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminOrderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this page" description="Something went wrong loading this order. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
