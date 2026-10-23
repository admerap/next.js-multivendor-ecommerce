"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminProductDetailsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this product" description="The catalog service didn't respond. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
