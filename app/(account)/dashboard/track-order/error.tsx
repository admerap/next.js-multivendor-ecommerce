"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function TrackOrderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't track this order" description="We couldn't fetch tracking details. Please try again." onRetry={reset} />
    </AccountCard>
  );
}
