"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function StorefrontError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] py-14">
      <div className="rounded-lg bg-card shadow-sm">
        <ErrorState title="Couldn't load the store" description="Something went wrong loading products. Check your connection and try again." onRetry={reset} />
      </div>
    </main>
  );
}
