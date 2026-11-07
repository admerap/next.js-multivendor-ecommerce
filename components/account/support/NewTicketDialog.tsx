"use client";

import { ChevronDown, ImagePlus, Plus, Send, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createTicketAction } from "@/lib/actions/support";
import { cn } from "@/lib/utils";
import {
  TICKET_BODY_MAX,
  TICKET_IMAGE_TYPES,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  TICKET_SUBJECT_MAX,
  TICKET_TYPE_LABEL,
  TICKET_TYPES,
  ticketSchema,
  type TicketPriority,
  type TicketType,
} from "@/lib/validations/support";

const control =
  "w-full min-w-0 rounded-md border border-line bg-card px-3.5 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error-500";

type Draft = { subject: string; type: TicketType; priority: TicketPriority | ""; description: string; attachment: File | null };
const EMPTY: Draft = { subject: "", type: "WEBSITE", priority: "", description: "", attachment: null };

/**
 * "Add New Ticket" button + the Submit New Ticket modal (supportticket design): Subject*, Type, Priority, Describe
 * your issue*, an optional PNG / JPG up to 5 MB. Checked here, then again on the server.
 */
export function NewTicketDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const preview = useMemo(() => (d.attachment ? URL.createObjectURL(d.attachment) : null), [d.attachment]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const set = (patch: Partial<Draft>) => {
    setD((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };
  const close = () => {
    if (pending) return;
    setOpen(false);
    setD(EMPTY);
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const parsed = ticketSchema.safeParse({ ...d, priority: d.priority || undefined });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    const form = new FormData();
    form.set("subject", d.subject);
    form.set("type", d.type);
    form.set("priority", d.priority);
    form.set("description", d.description);
    if (d.attachment) form.set("attachment", d.attachment);
    start(async () => {
      const res = await createTicketAction(form).catch(() => ({
        success: false as const,
        error: "We couldn't reach the server. Please try again.",
        fieldErrors: undefined,
      }));
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setOpen(false);
      setD(EMPTY);
      router.refresh();
    });
  };

  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Add New Ticket
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:w-[min(600px,calc(100vw-32px))]">
          <DialogTitle>Submit New Ticket</DialogTitle>
          <DialogDescription>Our team usually responds within 24 hours.</DialogDescription>
          <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <Field id="tk-subject" label="Subject" required error={errors.subject}>
              <input
                {...ariaFor("tk-subject", errors.subject)}
                value={d.subject}
                maxLength={TICKET_SUBJECT_MAX}
                onChange={(e) => set({ subject: e.target.value })}
                placeholder="e.g. Order #100197 arrived damaged"
                className={cn(control, "h-11")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="tk-type" label="Type" error={errors.type}>
                <Select
                  id="tk-type"
                  error={errors.type}
                  value={d.type}
                  onChange={(v) => set({ type: v as TicketType })}
                  options={TICKET_TYPES.map((t) => [t, TICKET_TYPE_LABEL[t]])}
                />
              </Field>
              <Field id="tk-priority" label="Priority" required error={errors.priority}>
                <Select
                  id="tk-priority"
                  error={errors.priority}
                  value={d.priority}
                  onChange={(v) => set({ priority: v as TicketPriority })}
                  options={[["", "Choose priority"], ...TICKET_PRIORITIES.map((p) => [p, TICKET_PRIORITY_LABEL[p]] as [string, string])]}
                />
              </Field>
            </div>
            <Field id="tk-description" label="Describe your issue" required error={errors.description}>
              <textarea
                {...ariaFor("tk-description", errors.description)}
                value={d.description}
                maxLength={TICKET_BODY_MAX}
                rows={5}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Tell us what happened — include the order number if it's about an order."
                className={cn(control, "resize-y py-3")}
              />
            </Field>
            <Field id="tk-attachment" label="Attachment" error={errors.attachment}>
              {d.attachment && preview ? (
                <div className="flex items-center gap-3 rounded-md border border-line p-2.5">
                  <Image src={preview} alt="" width={56} height={56} unoptimized className="size-14 rounded-sm object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{d.attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => set({ attachment: null })}
                    aria-label="Remove attachment"
                    className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-sunken hover:text-error-600"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line-default px-4 py-3.5 text-fg-muted transition-colors duration-(--dur-fast) hover:border-primary hover:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
                  <ImagePlus aria-hidden className="size-5.5 shrink-0" strokeWidth={1.7} />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-fg-strong">Upload an image</span>
                    <span className="text-caption">PNG or JPG, up to 5 MB</span>
                  </span>
                  <input
                    id="tk-attachment"
                    type="file"
                    accept={TICKET_IMAGE_TYPES.join(",")}
                    className="sr-only"
                    aria-invalid={errors.attachment ? true : undefined}
                    aria-describedby={errors.attachment ? "tk-attachment-error" : undefined}
                    onChange={(e) => {
                      set({ attachment: e.target.files?.[0] ?? null });
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </Field>
            <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={pending} onClick={close}>
                <X aria-hidden />
                Close
              </Button>
              <Button type="submit" disabled={pending}>
                <Send aria-hidden />
                {pending ? "Submitting…" : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  error?: string;
}) {
  return (
    <div className="relative">
      <select
        {...ariaFor(id, error)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(control, "h-11 cursor-pointer appearance-none pr-10")}
      >
        {options.map(([v, label]) => (
          <option key={v} value={v} disabled={v === "" && value !== ""}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}
