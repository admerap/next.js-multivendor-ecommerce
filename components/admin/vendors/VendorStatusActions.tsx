"use client";

import { Ban, CircleCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { changeVendorStatus } from "@/app/admin/(panel)/vendors/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VENDOR_TRANSITIONS, type VendorStatus, type VendorStatusAction } from "@/lib/validations/admin-vendor";

/**
 * Approve / Suspend on the vendor details page. Only the actions allowed from the current status
 * are shown; Suspend asks for confirmation first. The server re-checks the transition.
 */
export function VendorStatusActions({ id, storeName, status }: { id: string; storeName: string; status: VendorStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<VendorStatusAction | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const can = (a: VendorStatusAction) => VENDOR_TRANSITIONS[a].from.includes(status);

  function run(action: VendorStatusAction) {
    setRunning(action);
    startTransition(async () => {
      const res = await changeVendorStatus({ id, action });
      setRunning(null);
      if (!res.success) {
        toast.error(res.error ?? "We couldn't update the vendor.");
        return;
      }
      setConfirmSuspend(false);
      toast.success(action === "APPROVE" ? `"${storeName}" approved — they can now open their dashboard` : `"${storeName}" suspended`);
      router.refresh();
    });
  }

  const spinner = <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current/35 border-t-current" />;

  return (
    <div className="flex flex-wrap gap-2.5">
      {can("APPROVE") && (
        <Button type="button" disabled={pending} onClick={() => run("APPROVE")} aria-busy={running === "APPROVE"}>
          {running === "APPROVE" ? spinner : <CircleCheck aria-hidden />}
          {status === "SUSPENDED" ? "Reactivate (Approve)" : "Approve"}
        </Button>
      )}
      {can("SUSPEND") && (
        <Button type="button" variant="danger" disabled={pending} onClick={() => setConfirmSuspend(true)}>
          <Ban aria-hidden />
          Suspend
        </Button>
      )}

      <Dialog open={confirmSuspend} onOpenChange={(o) => !pending && setConfirmSuspend(o)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <Ban aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Suspend &ldquo;{storeName}&rdquo;?</DialogTitle>
          <DialogDescription>
            {status === "PENDING"
              ? "The application is turned down and the owner can't open the vendor dashboard. You can approve the store later."
              : "The owner loses access to the vendor dashboard right away. You can reactivate the store later."}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmSuspend(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => run("SUSPEND")}
              aria-busy={running === "SUSPEND"}
              className="bg-error-500 !text-on-primary hover:bg-error-600"
            >
              {running === "SUSPEND" ? spinner : <Ban aria-hidden />}
              {running === "SUSPEND" ? "Suspending…" : "Suspend vendor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
