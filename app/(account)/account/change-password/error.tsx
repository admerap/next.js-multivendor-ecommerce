"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function ChangePasswordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load this page" description="Something went wrong loading Change Password. Please try again." onRetry={reset} />
    </AccountCard>
  );
}
