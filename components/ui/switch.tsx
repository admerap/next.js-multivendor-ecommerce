"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 Switch: iris when on. 44px tall hit area around a 24px track. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center outline-none disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="flex h-6 w-11 items-center rounded-full bg-line-default p-0.5 transition-colors duration-(--dur-fast) group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary group-data-[state=checked]:bg-primary"
      >
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-card shadow-sm transition-transform duration-(--dur-fast) ease-out data-[state=checked]:translate-x-5" />
      </span>
    </SwitchPrimitive.Root>
  );
}
