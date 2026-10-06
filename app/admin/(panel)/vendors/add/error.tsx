"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AddVendorError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't open this form" description="Something went wrong loading Add New Vendor. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
