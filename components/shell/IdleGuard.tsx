"use client";

import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { expireSessionAction, reportActivityAction } from "@/lib/actions/session";
import { ACTIVITY_PING_MS, IDLE_LIMIT_MS, IDLE_WARNING_MS, MAX_SESSION_MS, MAX_WARNING_MS, type ExpiredReason } from "@/lib/session-policy";

/** Shared by every open tab of the panel, so working in one keeps the others signed in too. */
const ACTIVITY_KEY = "sundry:last-activity";
const PING_KEY = "sundry:last-activity-ping";
const read = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0;
  } catch {
    return 0;
  }
};
const write = (k: string, v: number) => {
  try {
    localStorage.setItem(k, String(v));
  } catch {
    // private mode / blocked storage: this tab still tracks itself
  }
};
/** The shared "last activity" only ever moves forward (a tab with an older clock can't pull it back). */
const markActive = (t: number) => write(ACTIVITY_KEY, Math.max(t, read(ACTIVITY_KEY)));
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Staff session timing in the admin and vendor shells (lib/session-policy). Real activity — mouse, keyboard,
 * scroll, touch — resets a 30-minute clock and is reported to the server at most once a minute (the server
 * enforces the same limits, so closing the tab doesn't keep a session alive). A minute before the limit a
 * dialog counts down with "Stay signed in"; at zero the session ends and the login page says why. Five minutes
 * before the 12-hour limit a notice warns that a new sign-in is coming.
 */
export function IdleGuard({ area, signedInAt }: { area: "ADMIN" | "VENDOR"; signedInAt?: number }) {
  const last = useRef(0);
  const ending = useRef(false);
  const [idleLeft, setIdleLeft] = useState<number | null>(null);
  const [maxLeft, setMaxLeft] = useState<number | null>(null);

  const expire = useCallback(
    (reason: ExpiredReason) => {
      if (ending.current) return;
      ending.current = true;
      void expireSessionAction(reason, area);
    },
    [area],
  );

  const ping = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - read(PING_KEY) < ACTIVITY_PING_MS) return;
      write(PING_KEY, now);
      const alive = await reportActivityAction();
      // The server already ended it (timed out while the laptop slept, signed out elsewhere, blocked…).
      if (!alive) expire(signedInAt && now - signedInAt >= MAX_SESSION_MS ? "max" : "idle");
    },
    [expire, signedInAt],
  );

  const activity = useCallback(
    (fromWarning = false) => {
      const now = Date.now();
      last.current = now;
      markActive(now);
      if (fromWarning) setIdleLeft(null);
      void ping(fromWarning);
    },
    [ping],
  );

  useEffect(() => {
    // Opening a page is activity.
    last.current = Date.now();
    markActive(last.current);
    void ping();
    let lastMove = 0;
    const onMove = () => {
      const now = Date.now();
      if (now - lastMove > 5_000) {
        lastMove = now;
        activity();
      }
    };
    const onAct = () => activity();
    const opts = { passive: true, capture: true } as const;
    for (const e of ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const) window.addEventListener(e, onAct, opts);
    window.addEventListener("mousemove", onMove, opts);

    const tick = () => {
      if (ending.current) return;
      const now = Date.now();
      const lastActive = Math.max(last.current, read(ACTIVITY_KEY));
      const left = IDLE_LIMIT_MS - (now - lastActive);
      if (left <= 0) return expire("idle");
      setIdleLeft(left <= IDLE_WARNING_MS ? left : null);
      if (signedInAt) {
        const maxRemaining = signedInAt + MAX_SESSION_MS - now;
        if (maxRemaining <= 0) return expire("max");
        setMaxLeft(maxRemaining <= MAX_WARNING_MS ? maxRemaining : null);
      }
    };
    const timer = window.setInterval(tick, 1000);
    // Waking from sleep / coming back to the tab: check at once, don't wait for the next second.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      for (const e of ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const) window.removeEventListener(e, onAct, opts);
      window.removeEventListener("mousemove", onMove, opts);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activity, expire, ping, signedInAt]);

  return (
    <>
      <Dialog open={idleLeft !== null} onOpenChange={(open) => !open && activity(true)}>
        <DialogContent hideClose className="sm:w-[min(440px,calc(100vw-32px))]">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-warning-50 text-warning-600">
              <Clock3 aria-hidden className="size-7" strokeWidth={1.8} />
            </span>
            <DialogTitle className="font-display text-xl font-extrabold text-fg-strong">Are you still there?</DialogTitle>
            <DialogDescription className="text-sm text-fg-muted">
              For your security, you&apos;ll be signed out after 30 minutes of inactivity.
            </DialogDescription>
            <p className="font-display text-4xl font-extrabold text-fg-strong tabular-nums" aria-live="polite">
              {mmss(idleLeft ?? 0)}
            </p>
            <div className="mt-2 flex w-full flex-col-reverse gap-2.5 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={() => expire("idle")}>
                <LogOut aria-hidden />
                Sign out now
              </Button>
              <Button className="flex-1" autoFocus onClick={() => activity(true)}>
                <ShieldCheck aria-hidden />
                Stay signed in
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {maxLeft !== null && idleLeft === null && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-90 mx-auto flex max-w-md items-start gap-3 rounded-lg bg-inverse px-4 py-3.5 text-sm text-on-primary shadow-xl">
          <Clock3 aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          <p>
            For your security, this session ends in <b className="tabular-nums">{mmss(maxLeft)}</b> (12 hours after signing in). Save your work — you&apos;ll sign in again after that.
          </p>
        </div>
      )}
    </>
  );
}
