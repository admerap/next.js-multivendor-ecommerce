"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function SupportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load your tickets" description="Something went wrong. Please try again in a moment." onRetry={reset} />
    </AccountCard>
  );
}
