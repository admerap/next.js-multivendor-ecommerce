import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 Button. `!text-*` beats the unlayered base `a { color }` when used asChild on links. */
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-(--dur-fast) ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary !text-on-primary shadow-primary hover:-translate-y-px hover:bg-primary-hover active:translate-y-0",
        secondary: "border border-line bg-card !text-fg-strong hover:border-primary hover:!text-primary",
        ghost: "!text-fg hover:bg-hover",
        accent: "bg-accent !text-fg-strong hover:bg-saffron-400/90",
        danger: "bg-error-50 !text-error-600 hover:bg-error-500 hover:!text-on-primary",
      },
      size: {
        sm: "h-9 px-3 text-caption",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
