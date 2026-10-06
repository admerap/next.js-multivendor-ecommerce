"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this vendor" description="Something went wrong reaching the marketplace. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
