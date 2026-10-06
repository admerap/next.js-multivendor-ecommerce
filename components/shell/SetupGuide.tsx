"use client";

import { ArrowRight, CircleCheck, ChevronRight, Circle, ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SetupStep = { label: string; description: string; href: string; done: boolean };

function Progress({ pct, className, fill }: { pct: number; className?: string; fill: string }) {
  return (
    <span aria-hidden className={cn("block h-1.5 overflow-hidden rounded-full", className)}>
      <span className={cn("block h-full rounded-full transition-[width] duration-(--dur-slow) ease-out", fill)} style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Sidebar "Setup Guide": real progress over the marketplace launch checklist; opens the checklist. */
export function SetupGuide({ steps, collapsed }: { steps: SetupStep[]; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const done = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const label = `Setup Guide, ${pct}% complete`;

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          title={label}
          className="mx-auto grid size-11 place-items-center rounded-md bg-linear-120 from-iris-600 to-iris-800 text-on-primary shadow-primary"
        >
          <ListChecks aria-hidden className="size-5" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="flex w-full items-center gap-3 rounded-lg bg-linear-120 from-iris-600 to-iris-800 p-3.5 text-left text-on-primary shadow-primary transition-transform duration-(--dur-fast) hover:-translate-y-px"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-on-primary/15">
            <ListChecks aria-hidden className="size-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Setup Guide</span>
            <Progress pct={pct} fill="bg-accent" className="my-1.5 bg-on-primary/25" />
            <span className="block text-[0.7rem] text-on-primary/80">{pct}% complete</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 opacity-80" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[min(500px,calc(100vw-32px))]">
          <DialogTitle>Setup Guide</DialogTitle>
          <DialogDescription>
            {done} of {steps.length} steps done. Finish these to get the marketplace ready for shoppers.
          </DialogDescription>
          <Progress pct={pct} fill="bg-primary" className="mt-4 bg-sunken" />
          <ul className="mt-5 flex flex-col gap-2.5">
            {steps.map((s) => (
              <li key={s.label} className={cn("flex items-start gap-3 rounded-lg border p-3.5", s.done ? "border-line bg-sunken" : "border-line")}>
                {s.done ? (
                  <CircleCheck aria-label="Done" className="mt-0.5 size-5 shrink-0 text-success-600" strokeWidth={2} />
                ) : (
                  <Circle aria-label="To do" className="mt-0.5 size-5 shrink-0 text-fg-subtle" strokeWidth={2} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-bold", s.done ? "text-fg-muted line-through" : "text-fg-strong")}>{s.label}</p>
                  <p className="mt-0.5 text-caption text-fg-muted">{s.description}</p>
                </div>
                {!s.done && (
                  <Link
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 self-center rounded-md px-2 text-caption font-bold"
                  >
                    Start
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
