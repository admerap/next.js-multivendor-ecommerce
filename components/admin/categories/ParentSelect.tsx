"use client";

import { CircleAlert } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
      <SearchableSelect
        id={id}
        value={value}
        onValueChange={onChange}
        options={options.map((o) => ({ value: o.id, label: o.name, hint: o.status === "INACTIVE" ? "(inactive)" : undefined }))}
        placeholder={placeholder}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        emptyText={`No ${label.toLowerCase()} matches`}
        ariaLabelledby={`${id}-label`}
        invalid={!!error}
        describedBy={error ? `${id}-error` : undefined}
        disabled={disabled}
        loading={loading}
        portal={false} // inside a dialog: keep the panel within its focus trap
      />
      {error && (
        <span id={`${id}-error`} className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </span>
      )}
    </div>
  );
}
