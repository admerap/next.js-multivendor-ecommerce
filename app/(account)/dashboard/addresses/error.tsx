"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function AddressesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load addresses" description="Please try again in a moment." onRetry={reset} />
    </AccountCard>
  );
}
