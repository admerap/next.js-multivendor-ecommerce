"use client";

import { ChevronDown, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useCan } from "@/components/admin/AdminPermissions";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { setTicketStatusAction, staffReplyAction, type AdminSupportResult } from "@/lib/actions/admin-support";
import { cn } from "@/lib/utils";
import { TICKET_BODY_MAX, TICKET_STATUS_LABEL, TICKET_STATUSES, type TicketStatus } from "@/lib/validations/support";

const control =
  "w-full min-w-0 rounded-md border border-line bg-card px-3.5 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500";

function StatusSelect({ id, value, onChange, disabled }: { id: string; value: TicketStatus; onChange: (s: TicketStatus) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as TicketStatus)}
        className={cn(control, "h-11 cursor-pointer appearance-none pr-10")}
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TICKET_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}

/**
 * Ticket details (admin): reply as Sundry Support — the ticket then moves to the chosen status (Answered by
 * default) — and a separate status switch. Hidden without Support Tickets › Update; the server checks again.
 */
export function StaffReply({ number, status }: { number: number; status: TicketStatus }) {
  const router = useRouter();
  const canUpdate = useCan("support", "update");
  const [body, setBody] = useState("");
  const [after, setAfter] = useState<TicketStatus>("ANSWERED");
  const [next, setNext] = useState<TicketStatus>(status);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!canUpdate) return <p className="text-sm text-fg-muted">Your role can read tickets but not reply or change their status.</p>;

  const run = (job: () => Promise<AdminSupportResult>, done?: () => void) =>
    start(async () => {
      const res = await job().catch((): AdminSupportResult => ({ success: false, error: "We couldn't reach the server. Please try again." }));
      if (!res.success) {
        setError(res.fieldErrors?.body);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      done?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          if (body.trim().length < 2) return setError("Write a reply.");
          run(
            () => staffReplyAction({ number, body, status: after }),
            () => setBody(""),
          );
        }}
        className="flex flex-col gap-3"
      >
        <Field id="staff-reply" label="Reply to the customer" error={error}>
          <textarea
            {...ariaFor("staff-reply", error)}
            value={body}
            maxLength={TICKET_BODY_MAX}
            rows={5}
            onChange={(e) => {
              setBody(e.target.value);
              setError(undefined);
            }}
            placeholder="Write your answer — the customer sees it on their ticket."
            className={cn(control, "resize-y py-3")}
          />
        </Field>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field id="staff-after" label="Then mark as" className="sm:w-52">
            <StatusSelect id="staff-after" value={after} onChange={setAfter} disabled={pending} />
          </Field>
          <Button type="submit" disabled={pending} className="sm:ml-auto">
            <Send aria-hidden />
            {pending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end">
        <Field id="staff-status" label="Change status without replying" className="sm:w-64">
          <StatusSelect id="staff-status" value={next} onChange={setNext} disabled={pending} />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || next === status}
          onClick={() => run(() => setTicketStatusAction({ number, status: next }))}
        >
          <RefreshCw aria-hidden />
          Update status
        </Button>
      </div>
    </div>
  );
}
