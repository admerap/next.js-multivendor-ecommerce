"use client";

import { MessageSquareReply, Pencil, Send, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { StarRating } from "@/components/commerce/StarRating";
import { iconActionClass } from "@/components/data/list-classes";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { removeReviewReplyAction, replyToReviewAction, type VendorReviewResult } from "@/lib/actions/vendor-reviews";
import { cn } from "@/lib/utils";
import { REVIEW_REPLY_MAX } from "@/lib/validations/vendor-review";

type Review = {
  id: string;
  ref: string;
  product: string;
  reviewer: string;
  rating: number;
  title: string | null;
  comment: string;
  reply: string | null;
  date: string;
};

/**
 * Product Reviews › Reply (vendorproductreview design): the review, then "Your reply" — Send reply / Cancel; an
 * existing reply can be edited or removed. The answer is public (product page, the customer's order).
 */
export function ReplyDialog({ review }: { review: Review }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(review.reply ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const run = (job: () => Promise<VendorReviewResult>) =>
    start(async () => {
      const res = await job().catch((): VendorReviewResult => ({ success: false, error: "We couldn't reach the store. Please try again." }));
      if (!res.success) {
        setError(res.fieldErrors?.reply);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });

  const edit = !!review.reply;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(review.reply ?? "");
          setError(undefined);
          setOpen(true);
        }}
        aria-label={`${edit ? "Edit reply to" : "Reply to"} review #${review.ref}`}
        title={edit ? "Edit reply" : "Reply"}
        className={cn(iconActionClass, "border-line bg-iris-50 text-primary! hover:bg-primary hover:text-on-primary!")}
      >
        {edit ? <Pencil aria-hidden className="size-4" strokeWidth={2} /> : <MessageSquareReply aria-hidden className="size-4" strokeWidth={2} />}
      </button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:w-[min(560px,calc(100vw-32px))]">
          <DialogTitle>
            Review #{review.ref} · {review.date}
          </DialogTitle>
          <DialogDescription>{review.product}</DialogDescription>
          <div className="mt-4 rounded-md bg-sunken p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-fg-strong">{review.reviewer}</span>
              <StarRating value={review.rating} />
            </div>
            {review.title && <p className="mt-1.5 text-sm font-bold text-fg-strong">{review.title}</p>}
            <p className="mt-1 max-h-40 overflow-y-auto text-sm whitespace-pre-line text-fg">{review.comment}</p>
          </div>
          <form
            noValidate
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (pending) return;
              if (draft.trim().length < 2) return setError("Write your reply.");
              run(() => replyToReviewAction({ id: review.id, reply: draft }));
            }}
          >
            <Field id={`reply-${review.id}`} label="Your reply" error={error} hint="Shown publicly under the review, and to the customer.">
              <textarea
                {...ariaFor(`reply-${review.id}`, error)}
                value={draft}
                maxLength={REVIEW_REPLY_MAX}
                rows={5}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(undefined);
                }}
                placeholder="Thank the customer, or answer their question…"
                className="w-full min-w-0 resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500"
              />
            </Field>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              {edit && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="text-error-600! sm:mr-auto"
                  onClick={() => run(() => removeReviewReplyAction({ id: review.id }))}
                >
                  <Trash2 aria-hidden />
                  Remove reply
                </Button>
              )}
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)} className={cn(!edit && "sm:ml-auto")}>
                <X aria-hidden />
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <Send aria-hidden />
                {pending ? "Sending…" : edit ? "Update reply" : "Send reply"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
