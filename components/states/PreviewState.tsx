"use client";

import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/data/DashCard";
import { ErrorState } from "./ErrorState";

export type PreviewKey = "default" | "loading" | "empty" | "error";

const OPTIONS: { key: PreviewKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "loading", label: "Loading" },
  { key: "empty", label: "Empty" },
  { key: "error", label: "Error" },
];

/** DESIGN_SYSTEM §5 PreviewState: dev/design switcher, shown only when NEXT_PUBLIC_SHOW_PREVIEW_STATE=true. */
export const previewEnabled = process.env.NEXT_PUBLIC_SHOW_PREVIEW_STATE === "true";

/**
 * Page frame with a title row whose right side carries the PREVIEW STATE switcher.
 * Renders the real page (`children`) by default and the chosen state's UI otherwise.
 */
export function PreviewStateFrame({
  heading,
  actions,
  loading,
  empty,
  error,
  children,
  className,
  errorCard = true,
}: {
  heading: ReactNode;
  actions?: ReactNode;
  loading: ReactNode;
  empty: ReactNode;
  error: { title: string; description: string };
  children: ReactNode;
  className?: string;
  /** Wrap the error state in its own card (off when the page already sits in a card). */
  errorCard?: boolean;
}) {
  const [state, setState] = useState<PreviewKey>("default");

  return (
    <>
      <div className={className ?? "flex flex-wrap items-end justify-between gap-4"}>
        <div className="min-w-0">{heading}</div>
        {(previewEnabled || actions) && (
          <div className="flex flex-wrap items-center gap-2.5 max-sm:w-full">
            {previewEnabled && (
              <>
                <span className="text-caption font-bold tracking-[0.06em] text-fg-muted uppercase max-sm:basis-full">
                  Preview state
                </span>
                <div className="max-sm:w-full">
                  <Segmented label="Preview state" options={OPTIONS} value={state} onChange={setState} />
                </div>
              </>
            )}
            {actions}
          </div>
        )}
      </div>

      {state === "default" && children}
      {state === "loading" && loading}
      {state === "empty" && empty}
      {state === "error" && (
        <div className={errorCard ? "rounded-lg bg-card shadow-sm" : undefined}>
          <ErrorState title={error.title} description={error.description} onRetry={() => setState("default")} />
        </div>
      )}
    </>
  );
}
