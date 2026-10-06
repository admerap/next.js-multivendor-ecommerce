"use client";

import { Ban, PowerOff, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { deleteBrand, toggleBrandStatus, type BrandRow } from "@/app/admin/(panel)/brands/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Delete confirmation naming the brand. Brands still used by products can't be deleted —
 * the dialog explains why and offers "Deactivate instead".
 */
export function DeleteBrandDialog({
  brand,
  open,
  onOpenChange,
  afterDelete,
}: {
  brand: Pick<BrandRow, "id" | "name" | "status" | "productsCount">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. navigate back to the list when deleting from the detail page. */
  afterDelete?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blockedMsg, setBlockedMsg] = useState(
    brand.productsCount > 0
      ? `"${brand.name}" is used by ${brand.productsCount} ${brand.productsCount === 1 ? "product" : "products"}. Deactivate it instead, or move those products to another brand first.`
      : "",
  );

  function remove() {
    startTransition(async () => {
      const res = await deleteBrand({ id: brand.id });
      if (!res.success) {
        if (res.data?.productsCount) setBlockedMsg(res.error ?? "");
        else toast.error(res.error ?? "We couldn't delete the brand.");
        return;
      }
      toast.success(`"${brand.name}" deleted`);
      onOpenChange(false);
      if (afterDelete) afterDelete();
      else router.refresh();
    });
  }

  function deactivate() {
    startTransition(async () => {
      const res = await toggleBrandStatus({ id: brand.id, status: "INACTIVE" });
      if (!res.success) {
        toast.error(res.error ?? "We couldn't update the status.");
        return;
      }
      toast.success(`"${brand.name}" deactivated`);
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
        <DialogTitle>{blockedMsg ? `Can't delete "${brand.name}"` : `Delete "${brand.name}"?`}</DialogTitle>
        <DialogDescription>
          {blockedMsg || "This permanently removes the brand and its logo. This can't be undone."}
        </DialogDescription>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            <X aria-hidden />
            Cancel
          </Button>
          {blockedMsg ? (
            brand.status === "ACTIVE" && (
              <Button type="button" disabled={pending} onClick={deactivate}>
                <PowerOff aria-hidden />
                {pending ? "Deactivating…" : "Deactivate instead"}
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={remove}
              className="bg-error-500 !text-on-primary hover:bg-error-600"
            >
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : "Delete brand"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
