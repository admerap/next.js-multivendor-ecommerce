"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const btn = "grid shrink-0 place-items-center rounded-md border transition-colors duration-(--dur-fast)";

/** Edit + Delete icon buttons used in every category table row and card (44px on cards). */
export function RowActions({ name, onEdit, onDelete, size }: { name: string; onEdit: () => void; onDelete: () => void; size: "size-9" | "size-11" }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onEdit} aria-label={`Edit ${name}`} title="Edit" className={cn(btn, size, "border-iris-100 bg-iris-50 !text-primary hover:border-primary")}>
        <Pencil aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${name}`} title="Delete" className={cn(btn, size, "border-error-50 bg-error-50 !text-error-600 hover:border-error-500")}>
        <Trash2 aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
