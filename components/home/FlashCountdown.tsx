"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const UNITS = [
  { key: "d", label: "Days", ms: 86_400_000 },
  { key: "h", label: "Hrs", ms: 3_600_000 },
  { key: "m", label: "Min", ms: 60_000 },
  { key: "s", label: "Sec", ms: 1_000 },
] as const;

function parts(left: number) {
  let rest = Math.max(0, left);
  return UNITS.map((u) => {
    const v = Math.floor(rest / u.ms);
    rest -= v * u.ms;
    return { ...u, value: pad(v) };
  });
}

/**
 * Flash Deal "Ends in 00 : 22 : 13 : 40". Ticks every second once mounted (the server renders "--"
 * so server and client HTML match). The screen-reader text only updates per minute.
 */
export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock after hydration
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const left = now === null ? null : end - now;
  const shown = left === null ? UNITS.map((u) => ({ ...u, value: "--" })) : parts(left);
  const minutes = left === null ? null : Math.ceil(Math.max(0, left) / 60_000);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-iris-100">Ends in</span>
      <div aria-hidden className="flex items-center gap-1.5 tabular-nums">
        {shown.map((u, i) => (
          <span key={u.key} className="flex items-center gap-1.5">
            {i > 0 && <span className="font-bold text-on-primary">:</span>}
            <span className="rounded-md bg-on-primary/15 px-2.5 py-1.5 text-center">
              <span className="block text-[1.125rem] leading-none font-extrabold text-on-primary">{u.value}</span>
              <span className="text-[0.56rem] tracking-[0.06em] text-iris-100 uppercase">{u.label}</span>
            </span>
          </span>
        ))}
      </div>
      <span className="sr-only">{minutes === null ? "" : minutes === 0 ? "Deal ended" : `Deal ends in about ${minutes} minutes`}</span>
    </div>
  );
}
