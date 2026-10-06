"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * DESIGN_SYSTEM §5 Dialog: dark blurred overlay, radius xl panel, 36px circular close.
 * Radix traps focus, restores it on close, closes on Escape and locks page scroll.
 * ≤720px it becomes a bottom sheet.
 */
export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-inverse/55 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-101 flex max-h-[92dvh] w-full flex-col overflow-y-auto bg-card shadow-xl outline-none",
          "inset-x-0 bottom-0 rounded-t-xl p-5 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(560px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-7",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-line bg-card text-fg-muted transition-colors duration-(--dur-fast) hover:border-error-50 hover:bg-error-50 hover:text-error-500 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("pr-10 font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-1.5 text-sm text-fg-muted", className)} {...props} />;
}
