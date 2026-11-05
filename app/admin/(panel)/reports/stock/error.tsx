"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminStockReportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this report" description="The reporting service didn't respond. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
