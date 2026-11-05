"use client";

import { useEffect, useRef } from "react";

/**
 * The ONE place the chat UI learns about new messages. Today it polls: `tick` runs every `ms` while the tab is
 * visible, right away when the tab comes back into view, and never twice at the same time.
 *
 * TODO(realtime): to switch to a realtime provider (Pusher / Ably / Supabase Realtime), replace this hook's
 * body with a channel subscription (e.g. `private-conversation-<id>` / `private-inbox-<side>-<id>`) that calls
 * `tick` when an event arrives. `tick` already fetches "what's new since my last message" through the
 * participant-scoped server actions, so the data model, the actions and the components stay as they are.
 */
export function useChatPolling(tick: () => Promise<unknown> | void, ms: number, enabled = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  }, [tick]);

  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const run = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        await latest.current();
      } finally {
        running = false;
      }
    };
    const id = window.setInterval(run, ms);
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [ms, enabled]);
}
