"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Chips input: type and press Enter (or comma) to add, Backspace on an empty input removes the last
 * one, ✕ removes any. Duplicates (case-insensitive) and over-long values are ignored.
 */
export function TagInput({
  id,
  values,
  onChange,
  placeholder,
  max,
  maxLength,
  invalid,
  describedBy,
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  max: number;
  maxLength: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = values.length >= max;

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim().slice(0, maxLength))
      .filter(Boolean);
    const next = [...values];
    for (const p of parts) if (next.length < max && !next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    if (next.length !== values.length) onChange(next);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-100)]",
        invalid ? "border-[1.5px] border-error-500" : "border-line",
      )}
    >
      {values.map((v) => (
        <span key={v} className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-iris-50 pr-0.5 pl-3 text-[0.82rem] font-semibold text-primary max-lg:h-11 max-lg:pr-0">
          <span className="truncate">{v}</span>
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-iris-100 max-lg:size-11"
          >
            <X aria-hidden className="size-3.5" strokeWidth={2.4} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={full}
        maxLength={maxLength + 1}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={full ? `Up to ${max}` : placeholder}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className="h-8 min-w-32 flex-1 bg-transparent max-lg:h-11 px-1.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed"
      />
    </div>
  );
}
