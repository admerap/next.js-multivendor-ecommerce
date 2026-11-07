"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function TicketError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load this ticket" description="Something went wrong. Please try again in a moment." onRetry={reset} />
    </AccountCard>
  );
}
