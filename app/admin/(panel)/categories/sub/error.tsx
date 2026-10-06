"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function SubCategoriesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load sub-categories" description="Something went wrong reaching the catalog. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
