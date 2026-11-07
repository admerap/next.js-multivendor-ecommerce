"use client";

import { CircleCheck, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { closeTicketAction, replyTicketAction, type SupportResult } from "@/lib/actions/support";
import { TICKET_BODY_MAX } from "@/lib/validations/support";

/** Ticket detail: the reply box and "Close ticket" (asks first). Both act only on the customer's own ticket. */
export function TicketReply({ number }: { number: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const run = (job: () => Promise<SupportResult>, after: () => void) =>
    start(async () => {
      const res = await job().catch((): SupportResult => ({ success: false, error: "We couldn't reach the server. Please try again." }));
      if (!res.success) {
        setError(res.fieldErrors?.body);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      after();
      router.refresh();
    });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (body.trim().length < 2) return setError("Write a reply.");
        run(
          () => replyTicketAction({ number, body }),
          () => setBody(""),
        );
      }}
      className="flex flex-col gap-3"
    >
      <Field id="tk-reply" label="Reply" error={error}>
        <textarea
          {...ariaFor("tk-reply", error)}
          value={body}
          maxLength={TICKET_BODY_MAX}
          rows={4}
          onChange={(e) => {
            setBody(e.target.value);
            setError(undefined);
          }}
          placeholder="Add more details or answer our team…"
          className="w-full min-w-0 resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500"
        />
      </Field>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirm(true)}>
          <CircleCheck aria-hidden />
          Close ticket
        </Button>
        <Button type="submit" disabled={pending}>
          <Send aria-hidden />
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={(o) => !pending && setConfirm(o)}>
        <DialogContent className="sm:w-[min(440px,calc(100vw-32px))]">
          <DialogTitle>Close this ticket?</DialogTitle>
          <DialogDescription>
            Close it if your issue is sorted. You won&apos;t be able to reply afterwards — open a new ticket if you need help again.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirm(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => closeTicketAction({ number }),
                  () => setConfirm(false),
                )
              }
            >
              <CircleCheck aria-hidden />
              {pending ? "Closing…" : "Close ticket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
