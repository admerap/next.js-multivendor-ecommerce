"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setProductFlag } from "@/app/admin/(panel)/products/actions";
import { cn } from "@/lib/utils";

const LABELS = { isFeatured: "Featured", isPopular: "Most Popular" } as const;

/**
 * Featured / Most Popular check box (role="checkbox", like the design's list column). Disabled until
 * the product is approved; a flagged product can always be unchecked (so it never gets stuck when it
 * goes back to pending or is denied). Optimistic, rolled back on error.
 */
export function ProductFlagToggle({
  id,
  name,
  flag,
  checked,
  approved,
  description,
  compact = false,
}: {
  id: string;
  name: string;
  flag: keyof typeof LABELS;
  checked: boolean;
  /** APPROVED review status — required to check the box. */
  approved: boolean;
  description?: string;
  /** Box only (list column); the label goes to aria-label. */
  compact?: boolean;
}) {
  const router = useRouter();
  const descId = useId();
  const [on, setOn] = useState(checked);
  const [pending, startTransition] = useTransition();
  const locked = !approved && !on;

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        const res = await setProductFlag({ id, flag, value: next });
        if (!res.success) {
          setOn(!next);
          toast.error(res.error ?? "We couldn't update the product.");
          return;
        }
        toast.success(next ? `${name} marked as ${LABELS[flag]}` : `${name} removed from ${LABELS[flag]}`);
        router.refresh();
      } catch {
        setOn(!next);
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  const box = (
    <span
      aria-hidden
      className={cn(
        "grid size-5.5 shrink-0 place-items-center rounded-sm border-[1.5px] transition-colors duration-(--dur-fast)",
        on ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-card",
      )}
    >
      {on && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );

  if (compact) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={`${LABELS[flag]}: ${name}`}
        title={locked ? "Approve the product first" : LABELS[flag]}
        disabled={locked || pending}
        onClick={toggle}
        className="grid size-9 place-items-center rounded-md hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 max-lg:size-11"
      >
        {box}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-describedby={description || locked ? descId : undefined}
      disabled={locked || pending}
      onClick={toggle}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors duration-(--dur-fast) disabled:cursor-not-allowed",
        on ? "border-primary bg-iris-50" : "border-line bg-card hover:border-primary",
        locked && "opacity-60 hover:border-line",
      )}
    >
      <span className="mt-0.5">{box}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-bold text-fg-strong">{LABELS[flag]}</span>
        {(description || locked) && (
          <span id={descId} className="text-caption text-fg-muted">
            {locked ? "Approve the product to enable it." : description}
          </span>
        )}
      </span>
    </button>
  );
}
