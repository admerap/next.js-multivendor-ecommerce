import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 Skeleton: neutral-100 → neutral-150 shimmer (1.4s). Shape it with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-[shimmer_1.4s_infinite] bg-[linear-gradient(100deg,var(--neutral-100)_30%,var(--neutral-150)_50%,var(--neutral-100)_70%)] bg-size-[200%_100%]",
        className,
      )}
    />
  );
}
