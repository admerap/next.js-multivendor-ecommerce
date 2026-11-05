"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function AdminRolesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <ErrorState title="Couldn't load this page" description="Something went wrong loading the roles. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
