"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { ErrorState } from "@/components/states/ErrorState";

export default function WishlistError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AccountCard>
      <ErrorState title="Couldn't load your wishlist" description="Something went wrong. Please try again." onRetry={reset} />
    </AccountCard>
  );
}
