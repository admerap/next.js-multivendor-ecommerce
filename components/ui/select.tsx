"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

/** DESIGN_SYSTEM §5 Select trigger: same frame as Input. */
export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-11.5 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-card px-3.5 text-sm font-semibold text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] data-placeholder:font-normal data-placeholder:text-fg-subtle",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** Dropdown panel: radius lg, shadow-xl, hairline border, 40–44px items (DESIGN_SYSTEM §5 Dropdown). */
export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-110 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-line bg-card p-1.5 shadow-xl",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-10.5 cursor-pointer items-center rounded-md pr-9 pl-3 text-sm font-semibold text-fg outline-none select-none data-highlighted:bg-iris-50 data-highlighted:text-primary data-[state=checked]:text-primary",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3">
        <Check aria-hidden className="size-4" strokeWidth={2.4} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
