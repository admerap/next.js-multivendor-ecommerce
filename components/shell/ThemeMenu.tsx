"use client";

import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const THEMES = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** DESIGN_SYSTEM §3 theme dropdown (Light / Dark / System with a check on the active item). */
export function ThemeMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = THEMES.find((t) => t.key === (mounted ? theme : "system")) ?? THEMES[2];
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-md border pr-2 pl-2.5 transition-colors duration-(--dur-fast)",
          open ? "border-iris-200 bg-iris-50 text-primary" : "border-line bg-card text-fg hover:text-primary",
        )}
      >
        <Icon aria-hidden className="size-[18px]" strokeWidth={1.9} />
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 opacity-70 transition-transform duration-(--dur-fast)", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-50 rounded-lg border border-line bg-card p-1.5 shadow-xl"
        >
          <div className="px-2.5 pt-2 pb-1.5 text-[0.65rem] font-bold tracking-[0.08em] text-fg-subtle uppercase">
            Appearance
          </div>
          {THEMES.map(({ key, label, icon: ItemIcon }) => {
            const on = current.key === key;
            return (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  setTheme(key);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-(--dur-fast)",
                  on ? "bg-iris-50 text-primary" : "text-fg hover:bg-iris-50 hover:text-primary",
                )}
              >
                <ItemIcon aria-hidden className="size-[18px]" strokeWidth={1.9} />
                <span className="flex-1 text-left">{label}</span>
                {on && <Check aria-hidden className="size-4" strokeWidth={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
