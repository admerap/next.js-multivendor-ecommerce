"use client";

import { PowerOff, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { adminDeleteCoupon } from "@/app/admin/(panel)/coupons/actions";
import { deleteCoupon } from "@/app/vendor/(panel)/coupons/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Delete with confirmation. A coupon that has been used is deactivated instead (the dialog says so),
 * so order history that references it stays meaningful. `scope="admin"` uses the admin action (any
 * store; re-checks the ADMIN role); `labeled` shows "Delete" next to the icon; `redirectTo` navigates
 * there after a real delete instead of refreshing.
 */
export function DeleteCouponButton({
  id,
  code,
  usedCount,
  className,
  scope = "vendor",
  labeled = false,
  redirectTo,
}: {
  id: string;
  code: string;
  usedCount: number;
  className?: string;
  scope?: "vendor" | "admin";
  labeled?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const used = usedCount > 0;

  function remove() {
    startTransition(async () => {
      try {
        const res = await (scope === "admin" ? adminDeleteCoupon : deleteCoupon)({ id });
        if (!res.success) {
          toast.error(res.error ?? "We couldn't delete the coupon.");
          return;
        }
        toast.success(res.data?.deactivated ? `${code} was used, so it was turned off instead` : `${code} deleted`);
        setOpen(false);
        if (redirectTo && !res.data?.deactivated) router.push(redirectTo);
        else router.refresh();
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labeled ? undefined : `Delete coupon ${code}`}
        title={labeled ? undefined : "Delete coupon"}
        className={cn(
          "shrink-0 place-items-center rounded-md border border-line bg-error-50 text-error-600 transition-colors duration-(--dur-fast) hover:bg-error-500 hover:text-on-primary",
          labeled ? "inline-flex h-11 items-center justify-center gap-2 px-4.5 text-sm font-semibold" : "grid size-9 max-lg:size-11",
          className,
        )}
      >
        <Trash2 aria-hidden className="size-4" strokeWidth={2} />
        {labeled && "Delete"}
      </button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            {used ? <PowerOff aria-hidden className="size-7" strokeWidth={1.8} /> : <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />}
          </span>
          <DialogTitle>{used ? `Turn off ${code}?` : `Delete ${code}?`}</DialogTitle>
          <DialogDescription>
            {used
              ? `This coupon was used ${usedCount} ${usedCount === 1 ? "time" : "times"}, so it can't be deleted — orders still refer to it. It will be turned off and buyers won't be able to use it.`
              : "This permanently removes the coupon. Buyers won't be able to use it. This can't be undone."}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={remove} className="bg-error-500 !text-on-primary hover:bg-error-600">
              {used ? <PowerOff aria-hidden /> : <Trash2 aria-hidden />}
              {pending ? (used ? "Turning off…" : "Deleting…") : used ? "Turn off coupon" : "Delete coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
