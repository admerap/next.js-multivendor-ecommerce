"use client";

import { Ban, TriangleAlert, X } from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cancelOrderAction } from "@/lib/actions/orders";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One seller's part of the order, when only that part is being canceled. */
type Part = { id: string; storeName: string; total: number };

/**
 * "Cancel order #…?" confirmation (My Order menu and Order details) — or, with `part`, "Cancel items
 * from <store>?" for one seller only. The server re-checks that the seller(s) haven't started packing,
 * gives the stock and coupon uses back, and keeps the order record.
 */
export function CancelOrderDialog({
  orderNumber,
  part,
  open,
  onOpenChange,
}: {
  orderNumber: number;
  part?: Part;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const res = await cancelOrderAction({ orderNumber, storeOrderId: part?.id }).catch(() => ({ ok: false as const, message: "We couldn't reach the store. Please try again." }));
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
        <DialogTitle>{part ? `Cancel items from ${part.storeName}?` : `Cancel order #${orderNumber}?`}</DialogTitle>
        <DialogDescription>
          {part
            ? `Only ${part.storeName}'s items are canceled and ${money(part.total)} comes off your total. Your other sellers keep preparing the rest of your order. This can't be undone.`
            : "Every seller in this order will stop preparing it. This can't be undone — you'd need to place a new order."}
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            <X aria-hidden />
            {part ? "Keep items" : "Keep order"}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={cancel} className="bg-error-500 !text-on-primary hover:bg-error-600">
            <Ban aria-hidden />
            {pending ? "Canceling…" : part ? "Cancel these items" : "Cancel order"}
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

/** Order details › under one seller's items: cancel just that seller's part (it hasn't started packing). */
export function CancelPartButton({ orderNumber, part }: { orderNumber: number; part: Part }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-error-600 transition-colors duration-(--dur-fast) hover:bg-error-50"
      >
        <Ban aria-hidden className="size-4" strokeWidth={2} />
        Cancel items from {part.storeName}
      </button>
      <CancelOrderDialog orderNumber={orderNumber} part={part} open={open} onOpenChange={setOpen} />
    </>
  );
}
