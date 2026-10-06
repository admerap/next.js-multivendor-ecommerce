"use client";

import { CircleAlert } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CategoryStatus } from "@/lib/validations/category";

/** Labelled parent picker for the sub / sub-sub modals, with inline error and a loading state. */
export function ParentSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
  loading = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string; status: CategoryStatus }[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={`${id}-label`} className="text-caption font-semibold text-fg">
        {label} <span aria-hidden className="text-error-500">*</span>
      </span>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-busy={loading || undefined}
          className={cn(error && "border-error-500", (disabled || loading) && "cursor-not-allowed opacity-60")}
        >
          {loading ? (
            <span className="flex items-center gap-2 font-normal text-fg-muted">
              <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-line-default border-t-primary" />
              Loading…
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
              {o.status === "INACTIVE" && <span className="ml-1.5 text-fg-subtle">(inactive)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <span id={`${id}-error`} className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </span>
      )}
    </div>
  );
}
