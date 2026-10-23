"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, labelCls } from "@/components/forms/FormBits";
import { cn } from "@/lib/utils";
import { DENY_REASON_MAX } from "@/lib/validations/admin-product";
import type { ApprovalStatus } from "@/lib/validations/product";

const ERR_NETWORK = "We couldn't reach the server. Please try again.";

type Result<T = undefined> = { success: boolean; error?: string; data?: T; fieldErrors?: { reason?: string } };

export type ReviewActionsProps = {
  id: string;
  /** The vendor's store name, used in the copy. */
  vendorName: string;
  status: ApprovalStatus;
  /** Used in the copy ("Deny this coupon?"). */
  noun: "product" | "coupon";
  approve: (input: { id: string }) => Promise<Result<{ isActive: boolean }>>;
  deny: (input: { id: string; reason: string }) => Promise<Result>;
  /** Toasts after approving: the vendor has it switched on / off. */
  approvedText: { live: string; hidden: string };
  presets: readonly string[];
};

/**
 * Deny (with a reason for the vendor) + Approve, from the adminproductdetail design — shared by the
 * product and coupon details pages. Deny is off once denied and Approve once approved; an approved
 * item can still be denied and vice versa.
 */
export function ReviewActions({ id, vendorName, status, noun, approve: approveAction, deny: denyAction, approvedText, presets }: ReviewActionsProps) {
  const router = useRouter();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [approving, startApprove] = useTransition();
  const [denying, startDeny] = useTransition();
  const busy = approving || denying;

  function approve() {
    startApprove(async () => {
      try {
        const res = await approveAction({ id });
        if (!res.success) return void toast.error(res.error ?? `We couldn't approve the ${noun}.`);
        toast.success(res.data?.isActive ? approvedText.live : approvedText.hidden);
        router.refresh();
      } catch {
        toast.error(ERR_NETWORK);
      }
    });
  }

  function deny(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return setError("Tell the vendor why (at least 3 characters).");
    startDeny(async () => {
      try {
        const res = await denyAction({ id, reason });
        if (!res.success) {
          if (res.fieldErrors?.reason) setError(res.fieldErrors.reason);
          else toast.error(res.error ?? `We couldn't deny the ${noun}.`);
          return;
        }
        toast.success(`${noun === "coupon" ? "Coupon" : "Product"} denied — ${vendorName} sees your reason`);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(ERR_NETWORK);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        disabled={status === "REJECTED" || busy}
        onClick={() => {
          setReason("");
          setError(undefined);
          setOpen(true);
        }}
      >
        <CircleX aria-hidden />
        {status === "REJECTED" ? "Denied" : "Deny"}
      </Button>
      <Button type="button" disabled={status === "APPROVED" || busy} onClick={approve} className="bg-success-500 shadow-none hover:bg-success-600">
        <CircleCheck aria-hidden />
        {approving ? "Approving…" : status === "APPROVED" ? "Approved" : "Approve"}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !denying && setOpen(o)}>
        <DialogContent className="sm:w-[min(520px,calc(100vw-32px))]">
          <DialogTitle>Deny this {noun}?</DialogTitle>
          <DialogDescription>{vendorName} sees your reason and can resubmit after fixing it.</DialogDescription>
          <form onSubmit={deny} noValidate className="mt-5 flex flex-col gap-4">
            <div role="group" aria-label="Common reasons" className="flex flex-wrap gap-2">
              {presets.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => {
                    setReason(r);
                    setError(undefined);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-caption font-semibold transition-colors duration-(--dur-fast) max-lg:h-11",
                    reason === r ? "border-primary bg-iris-50 text-primary" : "border-line bg-card text-fg hover:border-primary hover:text-primary",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={reasonId} className={labelCls}>
                Reason for the vendor
                <span aria-hidden className="text-error-500">
                  *
                </span>
              </label>
              <textarea
                id={reasonId}
                rows={3}
                value={reason}
                maxLength={DENY_REASON_MAX}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(undefined);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${reasonId}-error` : undefined}
                placeholder="e.g. Photos don't match the listed colors"
                className="min-h-24 w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-100)] aria-invalid:border-[1.5px] aria-invalid:border-error-500"
              />
              {!error && (
                <span className="text-caption text-fg-muted tabular-nums">
                  {reason.length}/{DENY_REASON_MAX}
                </span>
              )}
              <FieldError id={reasonId} error={error} />
            </div>
            <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={denying} onClick={() => setOpen(false)}>
                <X aria-hidden />
                Cancel
              </Button>
              <Button type="submit" disabled={denying || reason.trim() === ""} className="bg-error-500 shadow-none hover:bg-error-600">
                <CircleX aria-hidden />
                {denying ? "Denying…" : `Deny ${noun}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
