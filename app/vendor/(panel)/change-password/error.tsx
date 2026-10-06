"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorChangePasswordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load your profile" description="Please check your connection and try again." onRetry={reset} />
    </div>
  );
}
