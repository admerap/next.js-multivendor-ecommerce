"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function InboxError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load your inbox" description="We couldn't reach the messaging service. Please try again." onRetry={reset} />
    </AccountCard>
  );
}
