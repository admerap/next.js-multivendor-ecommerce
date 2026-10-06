import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 Input: 44–46px, radius md, subtle border, iris focus ring, error border via aria-invalid. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11.5 w-full min-w-0 rounded-md border border-line bg-card px-3.5 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] aria-invalid:border-[1.5px] aria-invalid:border-error-500 aria-invalid:shadow-[0_0_0_3px_var(--error-50)]",
        className,
      )}
      {...props}
    />
  );
}
