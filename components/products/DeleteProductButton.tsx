"use client";

import { Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { adminDeleteProduct } from "@/app/admin/(panel)/products/actions";
import { deleteProduct } from "@/app/vendor/(panel)/products/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Delete button + confirmation dialog naming the product. `labeled` shows "Delete" next to the icon
 * (details page); `redirectTo` navigates there after deleting instead of refreshing the list.
 * `scope="admin"` deletes through the admin action (any store; re-checks the ADMIN role).
 */
export function DeleteProductButton({
  id,
  name,
  className,
  labeled = false,
  redirectTo,
  scope = "vendor",
}: {
  id: string;
  name: string;
  className?: string;
  labeled?: boolean;
  redirectTo?: string;
  scope?: "vendor" | "admin";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        const res = await (scope === "admin" ? adminDeleteProduct : deleteProduct)({ id });
        if (!res.success) {
          toast.error(res.error ?? "We couldn't delete the product.");
          return;
        }
        toast.success(`${name} deleted`);
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
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
        aria-label={labeled ? undefined : `Delete ${name}`}
        title={labeled ? undefined : "Delete"}
        className={cn(
          "shrink-0 place-items-center rounded-md border border-line bg-error-50 text-error-600 transition-colors duration-(--dur-fast) hover:bg-error-500 hover:text-on-primary",
          labeled ? "inline-flex h-11 items-center gap-2 px-4.5 text-sm font-semibold" : "grid size-9 max-lg:size-11",
          className,
        )}
      >
        <Trash2 aria-hidden className="size-4" strokeWidth={2} />
        {labeled && "Delete"}
      </button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Delete “{name}”?</DialogTitle>
          <DialogDescription>This permanently removes the product, its variations and its images. This can&apos;t be undone.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={remove} className="bg-error-500 !text-on-primary hover:bg-error-600">
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : "Delete product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
