"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorListError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load vendors" description="Something went wrong reaching the marketplace. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
