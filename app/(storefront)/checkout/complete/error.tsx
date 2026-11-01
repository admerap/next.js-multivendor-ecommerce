"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function OrderCompleteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-8 pb-4">
      <div className="rounded-lg bg-card shadow-sm">
        <ErrorState title="Couldn't load your order" description="Your order was placed, but we couldn't load its details right now. Check your connection and try again." onRetry={reset} />
      </div>
    </main>
  );
}
