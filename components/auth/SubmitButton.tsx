import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Primary auth CTA. Busy state matches the designs: iris-400 fill, spinner, wait cursor. */
export function SubmitButton({
  pending,
  icon: Icon,
  children,
  pendingLabel,
  block = true,
  size = "lg",
  trailing,
  disabled = false,
}: {
  pending: boolean;
  /** Blocks submission (e.g. until terms are accepted). Separate from the busy state. */
  disabled?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  pendingLabel: string;
  block?: boolean;
  /** md = 48px, lg = 52px, xl = 56px */
  size?: "md" | "lg" | "xl";
  trailing?: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-md font-semibold text-on-primary transition-[background-color,box-shadow,transform] duration-(--dur-fast) ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        block ? "w-full" : "px-6",
        size === "md" && "h-12 text-[0.9375rem]",
        size === "lg" && "h-12.5 text-base",
        size === "xl" && "h-13 text-base font-bold",
        pending
          ? "cursor-wait bg-iris-400"
          : disabled
            ? "cursor-not-allowed bg-iris-200"
            : "cursor-pointer bg-primary shadow-primary hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 active:bg-primary-active",
      )}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-[18px] animate-spin rounded-full border-[2.5px] border-on-primary/35 border-t-on-primary"
        />
      ) : (
        Icon && <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
      )}
      {pending ? pendingLabel : children}
      {!pending && trailing}
    </button>
  );
}
