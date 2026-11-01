"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function ProfileError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
    <ErrorState
      title="Couldn't load your profile"
      description="Something went wrong fetching your account details. Please try again."
      onRetry={reset}
    />
    </AccountCard>
  );
}
