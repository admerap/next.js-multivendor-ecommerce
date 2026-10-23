"use client";

import { Eye } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/data/DashCard";
import { cn } from "@/lib/utils";
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
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <>
      {/* Page header: title (+ count) on the left, the main action on the right — nothing in between. */}
      <div className={className ?? "flex flex-wrap items-end justify-between gap-4"}>
        <div className="min-w-0">{heading}</div>
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:*:w-full">{actions}</div>}
      </div>

      {/* Dev/design-only state switcher, floating so it never takes space in the page header. */}
      {previewEnabled && (
        <div
          className="fixed right-4 bottom-24 z-30 flex flex-col items-end gap-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSwitcherOpen(false);
          }}
        >
          {switcherOpen && (
            <div id="preview-state-panel" className="flex flex-col gap-2 rounded-lg border border-line bg-card p-2.5 shadow-xl">
              <span className="px-1 text-caption font-bold tracking-[0.06em] text-fg-muted uppercase">Preview state</span>
              <Segmented label="Preview state" options={OPTIONS} value={state} onChange={setState} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setSwitcherOpen((o) => !o)}
            aria-expanded={switcherOpen}
            aria-controls="preview-state-panel"
            aria-label={`Preview: ${OPTIONS.find((o) => o.key === state)?.label}`}
            title={`Preview state: ${OPTIONS.find((o) => o.key === state)?.label}`}
            // Icon-only so it covers as little of the page as possible; iris when a non-default state is shown.
            className={cn(
              "grid size-11 place-items-center rounded-full border shadow-lg transition-colors duration-(--dur-fast) hover:border-primary hover:text-primary",
              state === "default" ? "border-line bg-card text-fg" : "border-primary bg-primary text-on-primary hover:text-on-primary",
            )}
          >
            <Eye aria-hidden className="size-4.5" strokeWidth={2} />
          </button>
        </div>
      )}

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
