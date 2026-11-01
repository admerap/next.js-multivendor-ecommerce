"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function OrderDetailsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load this order" description="Something went wrong fetching your order details. Please try again." onRetry={reset} />
    </AccountCard>
  );
}
