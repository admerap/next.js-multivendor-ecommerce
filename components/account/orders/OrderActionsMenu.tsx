"use client";

import { Ban, Download, EllipsisVertical, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setOrderHiddenAction } from "@/lib/actions/orders";
import { accountOrderHref, invoiceHref } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { CancelOrderDialog } from "./CancelOrderDialog";

const item =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-3.5 text-sm font-medium transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/**
 * The ⋮ menu on an order card (userOrder design): Download Invoice, View Order Details, and — instead of
 * deleting (orders are never deleted) — Cancel order while it's still cancelable, and Hide from my
 * orders (undo from the toast). Escape or a click outside closes it.
 */
export function OrderActionsMenu({ orderNumber, canCancel }: { orderNumber: number; canCancel: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function hide(hidden: boolean) {
    setOpen(false);
    start(async () => {
      const res = await setOrderHiddenAction({ orderNumber }, hidden).catch(() => ({ ok: false as const, message: "We couldn't reach the store. Please try again." }));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (!hidden) {
        toast.success(res.message);
        return;
      }
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            {res.message}
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                hide(false);
              }}
              className="min-h-11 shrink-0 rounded-sm px-2 font-bold text-primary underline underline-offset-2"
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000 },
      );
    });
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for order #${orderNumber}`}
        disabled={pending}
        className="grid size-11 place-items-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:text-primary disabled:opacity-55"
      >
        <EllipsisVertical aria-hidden className="size-5" strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" aria-label={`Order #${orderNumber}`} className="absolute top-full right-0 z-30 mt-1 w-60 rounded-lg border border-line bg-card p-1.5 shadow-xl">
          <a role="menuitem" href={invoiceHref(orderNumber)} download onClick={() => setOpen(false)} className={cn(item, "!text-fg hover:bg-hover")}>
            Download Invoice
            <Download aria-hidden className="size-4.5 text-fg-muted" strokeWidth={2} />
          </a>
          <Link role="menuitem" href={accountOrderHref(orderNumber)} onClick={() => setOpen(false)} className={cn(item, "!text-fg hover:bg-hover")}>
            View Order Details
            <Eye aria-hidden className="size-4.5 text-fg-muted" strokeWidth={2} />
          </Link>
          <div aria-hidden className="my-1 h-px bg-line" />
          {canCancel && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirm(true);
              }}
              className={cn(item, "text-error-600 hover:bg-error-50")}
            >
              Cancel order
              <Ban aria-hidden className="size-4.5" strokeWidth={2} />
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => hide(true)} className={cn(item, "text-fg hover:bg-hover")}>
            Hide from my orders
            <EyeOff aria-hidden className="size-4.5 text-fg-muted" strokeWidth={2} />
          </button>
        </div>
      )}

      <CancelOrderDialog orderNumber={orderNumber} open={confirm} onOpenChange={setConfirm} />
    </div>
  );
}
