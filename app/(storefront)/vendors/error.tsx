"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function VendorsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-6 pb-4">
      <div className="rounded-lg bg-card shadow-sm">
        <ErrorState title="Couldn't load stores" description="We couldn't reach our sellers right now. Check your connection and try again." onRetry={reset} />
      </div>
    </main>
  );
}
