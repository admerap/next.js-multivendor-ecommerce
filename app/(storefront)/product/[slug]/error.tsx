"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function ProductError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-5 pb-4">
      <div className="rounded-lg bg-card shadow-sm">
        <ErrorState title="Something went wrong" description="We couldn't load this product right now. Check your connection and try again." onRetry={reset} />
      </div>
    </main>
  );
}
