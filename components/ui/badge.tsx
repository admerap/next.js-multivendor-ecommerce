import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 StatusBadge: pill with a 6px currentColor dot; colours from the §6 status map. */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current before:content-['']",
  {
    variants: {
      tone: {
        success: "bg-success-50 text-success-600",
        neutral: "bg-sunken text-fg-muted",
        info: "bg-info-50 text-info-600",
        warning: "bg-warning-50 text-warning-600",
        error: "bg-error-50 text-error-600",
        primary: "bg-iris-50 text-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
