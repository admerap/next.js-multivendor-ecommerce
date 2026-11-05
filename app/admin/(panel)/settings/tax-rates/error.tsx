"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function TaxRatesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load tax rates" description="Something went wrong reaching the database. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
