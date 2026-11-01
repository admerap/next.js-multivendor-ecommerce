"use client";

import { Ban, TriangleAlert, X } from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cancelOrderAction } from "@/lib/actions/orders";
import { cn } from "@/lib/utils";

/**
 * "Cancel order #…?" confirmation (My Order menu and Order details). The server re-checks that no
 * seller has started packing, gives the stock and coupon uses back, and keeps the order record.
 */
export function CancelOrderDialog({ orderNumber, open, onOpenChange }: { orderNumber: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const res = await cancelOrderAction({ orderNumber }).catch(() => ({ ok: false as const, message: "We couldn't reach the store. Please try again." }));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onOpenChange(false);
      toast.success(res.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]">
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
          <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
        </span>
        <DialogTitle>Cancel order #{orderNumber}?</DialogTitle>
        <DialogDescription>Every seller in this order will stop preparing it. This can&apos;t be undone — you&apos;d need to place a new order.</DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            <X aria-hidden />
            Keep order
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={cancel} className="bg-error-500 !text-on-primary hover:bg-error-600">
            <Ban aria-hidden />
            {pending ? "Canceling…" : "Cancel order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Order details › the full-width "Cancel Order" button under the totals (userorderdetails design). */
export function CancelOrderButton({ orderNumber, className }: { orderNumber: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-error-50 text-sm font-semibold text-error-600 transition-colors duration-(--dur-fast) hover:bg-error-500 hover:text-on-primary", className)}
      >
        <Ban aria-hidden className="size-4" strokeWidth={2} />
        Cancel Order
      </button>
      <CancelOrderDialog orderNumber={orderNumber} open={open} onOpenChange={setOpen} />
    </>
  );
}
