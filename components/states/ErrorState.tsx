"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

/** DESIGN_SYSTEM §5 ErrorState: error-50 circle, triangle icon, H3, muted copy, Retry. */
export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3.5 px-6 py-14 text-center">
      <span className="grid size-19 place-items-center rounded-full bg-error-50">
        <TriangleAlert aria-hidden className="size-9 text-error-500" strokeWidth={1.6} />
      </span>
      <h3 className="font-display text-h4 font-bold text-fg-strong">{title}</h3>
      <p className="max-w-[380px] text-sm text-fg-muted">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1.5 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary shadow-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
        Retry
      </button>
    </div>
  );
}
