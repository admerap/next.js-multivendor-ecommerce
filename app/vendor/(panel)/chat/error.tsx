"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorChatError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load your messages" description="We couldn't reach the messaging service. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
