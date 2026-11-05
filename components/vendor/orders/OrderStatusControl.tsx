"use client";

import { Lock, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSubOrderStatus } from "@/lib/actions/vendor-orders";
import { ORDER_STATUS_LABEL, VENDOR_NEXT_STATUSES, type OrderStatusKey } from "@/lib/orders";

/** Moves that can't be undone get a confirmation first. */
const FINAL: OrderStatusKey[] = ["CANCELED", "RETURNED", "FAILED"];
const CONFIRM_COPY: Partial<Record<OrderStatusKey, string>> = {
  CANCELED: "The buyer is told this part of the order was canceled, and its stock and coupon use go back to your store. This can't be undone.",
  RETURNED: "Mark the items as returned to your store. This is final. Stock isn't added back automatically — update it from the product if the items can be resold.",
  FAILED: "Mark this delivery as failed. This is final, and the buyer sees that it couldn't be delivered.",
};

/**
 * Order details › Change order status (vendororderdetails design). Offers only the moves allowed from
 * the current status (VENDOR_NEXT_STATUSES); the server checks them again, plus ownership. Keyed by
 * status in the parent, so it resets after each change.
 */
export function OrderStatusControl({ id, orderNumber, status }: { id: string; orderNumber: number; status: OrderStatusKey }) {
  const next = VENDOR_NEXT_STATUSES[status];
  const [to, setTo] = useState<OrderStatusKey | "">("");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (next.length === 0) {
    return (
      <p className="flex items-start gap-2.5 rounded-md bg-sunken p-3.5 text-sm text-fg-muted">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
        <span>
          This order is <b className="text-fg-strong">{ORDER_STATUS_LABEL[status].toLowerCase()}</b> — that&apos;s final, so its status can&apos;t change any more.
        </span>
      </p>
    );
  }

  function save() {
    if (!to) return;
    start(async () => {
      const res = await updateSubOrderStatus({ id, status: to }).catch(() => ({ ok: false as const, message: "We couldn't reach the store. Please try again." }));
      setConfirming(false);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!to) return;
        if (FINAL.includes(to)) setConfirming(true);
        else save();
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-fg-strong">Change order status</span>
        <Select value={to} onValueChange={(v) => setTo(v as OrderStatusKey)} disabled={pending}>
          <SelectTrigger aria-label="Change order status">
            <SelectValue placeholder={`Currently ${ORDER_STATUS_LABEL[status].toLowerCase()} — choose next step`} />
          </SelectTrigger>
          <SelectContent>
            {next.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Button type="submit" disabled={!to || pending} className="w-full">
        <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} />
        {pending ? "Updating…" : "Update Status"}
      </Button>

      <Dialog open={confirming} onOpenChange={(o) => !pending && setConfirming(o)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]">
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>
            Mark order #{orderNumber} as {to ? ORDER_STATUS_LABEL[to].toLowerCase() : ""}?
          </DialogTitle>
          <DialogDescription>{to ? CONFIRM_COPY[to] : ""}</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              <X aria-hidden />
              Keep {ORDER_STATUS_LABEL[status].toLowerCase()}
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={save} className="bg-error-500 !text-on-primary hover:bg-error-600">
              <TriangleAlert aria-hidden />
              {pending ? "Updating…" : `Yes, ${to ? ORDER_STATUS_LABEL[to].toLowerCase() : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
