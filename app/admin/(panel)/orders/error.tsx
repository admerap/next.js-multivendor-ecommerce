"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminOrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this page" description="Something went wrong loading the orders. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
