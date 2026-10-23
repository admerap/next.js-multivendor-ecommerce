"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Long content clamped to a fixed height with a fade and a "See More" / "See Less" button (Product
 * Detail Page design). The button only appears when the content actually overflows.
 */
export function ExpandableText({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={ref}
        id={id}
        className={cn(
          "relative overflow-hidden",
          !open && "max-h-96",
          !open && overflows && "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-20 after:bg-linear-to-t after:from-card after:to-transparent",
        )}
      >
        {children}
      </div>
      {(overflows || open) && (
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            {open ? "See Less" : "See More"}
          </Button>
        </div>
      )}
    </div>
  );
}
