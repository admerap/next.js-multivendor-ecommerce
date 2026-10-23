"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function PendingProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load products" description="The catalog service didn't respond. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
