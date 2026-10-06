"use client";

import { Ban, PowerOff, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CategoryStatus } from "@/lib/validations/category";

type Result = { success: boolean; error?: string; data?: Record<string, number | undefined> };

/**
 * Delete confirmation naming the item, shared by the three levels. Items that still have
 * children or products can't be deleted — the dialog explains why and offers "Deactivate instead".
 */
export function DeleteItemDialog({
  noun,
  name,
  status,
  blockedReason,
  extraNote,
  remove,
  deactivate,
  open,
  onOpenChange,
}: {
  /** "category", "sub-category", "sub-sub-category". */
  noun: string;
  name: string;
  status: CategoryStatus;
  /** Known up front from the row's counts; the server re-checks on delete. */
  blockedReason: string;
  /** e.g. " and its image". */
  extraNote?: string;
  remove: () => Promise<Result>;
  deactivate: () => Promise<{ success: boolean; error?: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blockedMsg, setBlockedMsg] = useState(blockedReason);

  function onDelete() {
    startTransition(async () => {
      const res = await remove();
      if (!res.success) {
        // Blocked results carry counts; anything else is a plain error.
        if (res.data && Object.values(res.data).some((n) => (n ?? 0) > 0)) setBlockedMsg(res.error ?? "");
        else toast.error(res.error ?? `We couldn't delete the ${noun}.`);
        return;
      }
      toast.success(`"${name}" deleted`);
      onOpenChange(false);
      router.refresh();
    });
  }

  function onDeactivate() {
    startTransition(async () => {
      const res = await deactivate();
      if (!res.success) {
        toast.error(res.error ?? "We couldn't update the status.");
        return;
      }
      toast.success(`"${name}" deactivated`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
          {blockedMsg ? <Ban aria-hidden className="size-7" strokeWidth={1.8} /> : <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />}
        </span>
        <DialogTitle>{blockedMsg ? `Can't delete "${name}"` : `Delete "${name}"?`}</DialogTitle>
        <DialogDescription>{blockedMsg || `This permanently removes the ${noun}${extraNote ?? ""}. This can't be undone.`}</DialogDescription>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            <X aria-hidden />
            Cancel
          </Button>
          {blockedMsg ? (
            status === "ACTIVE" && (
              <Button type="button" disabled={pending} onClick={onDeactivate}>
                <PowerOff aria-hidden />
                {pending ? "Deactivating…" : "Deactivate instead"}
              </Button>
            )
          ) : (
            <Button type="button" variant="danger" disabled={pending} onClick={onDelete} className="bg-error-500 !text-on-primary hover:bg-error-600">
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : `Delete ${noun}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
