"use client";

import { CircleAlert, ExternalLink, FileCheck2, FileText, ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Upload drop zone from the adminaddvendor design: dashed tile with an iris icon, image preview
 * (cover-fit) and a remove button. `kind="document"` shows the file name instead of a preview.
 */
export function FileDrop({
  label,
  hint,
  accept,
  file,
  onChange,
  error,
  required = false,
  kind = "image",
  aspect = "square",
  currentUrl,
  currentHref,
  onRemoveCurrent,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  kind?: "image" | "document";
  /** square = 1:1 (200px), wide = 4:1 cover (440px). */
  aspect?: "square" | "wide";
  /** Edit forms: the image already saved (shown until a new file is picked). */
  currentUrl?: string | null;
  /** Edit forms: a document already on file, viewable through this (authorized) link. */
  currentHref?: string | null;
  /** Edit forms: clears the saved image/document (the parent decides what that means). */
  onRemoveCurrent?: () => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const preview = useMemo(() => (kind === "image" && file ? URL.createObjectURL(file) : null), [file, kind]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const box =
    kind === "document"
      ? "mt-2.5 min-h-32 w-full p-4"
      : aspect === "wide"
        ? "mx-auto mt-2.5 aspect-[4/1] w-full max-w-110"
        : "mx-auto mt-2.5 aspect-square w-full max-w-50";

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-bold text-fg-strong">
        {label} {required && <span aria-hidden className="text-error-500">*</span>}
      </span>
      <span className="text-caption text-fg-muted">{hint}</span>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onChange(e.dataTransfer.files[0] ?? null);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-[1.5px] border-dashed bg-card text-center transition-colors duration-(--dur-fast) hover:border-primary hover:bg-iris-50",
          box,
          dragging ? "border-primary bg-iris-50" : error ? "border-error-500" : "border-line-default",
        )}
      >
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-labelledby={`${id}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
        {preview || (kind === "image" && currentUrl) ? (
          <span
            role="img"
            aria-label={preview ? `${label} preview` : `Current ${label.toLowerCase()}`}
            className="absolute inset-0 bg-sunken bg-cover bg-center"
            style={{ backgroundImage: `url("${preview ?? currentUrl}")` }}
          />
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-md bg-iris-50 text-primary">
              {kind === "document" ? <FileText aria-hidden className="size-5" strokeWidth={2} /> : <ImagePlus aria-hidden className="size-5" strokeWidth={2} />}
            </span>
            <span className="px-2 text-caption text-fg">
              <b className="text-primary">{kind === "document" ? "Select a file" : "Click to upload"}</b> or drag and drop
            </span>
            {kind === "document" && file && <span className="max-w-full truncate px-2 text-caption font-bold text-fg-strong">{file.name}</span>}
            {kind === "document" && !file && currentHref && <span className="px-2 text-caption text-fg-muted">to replace the file on record</span>}
          </>
        )}
        {!file && kind === "image" && currentUrl && onRemoveCurrent && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveCurrent();
            }}
            aria-label={`Remove current ${label.toLowerCase()}`}
            className="absolute top-2 right-2 z-2 grid size-8 place-items-center rounded-full bg-card text-fg-strong shadow-sm hover:text-error-600"
          >
            <X aria-hidden className="size-4" strokeWidth={2.2} />
          </button>
        )}
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(null);
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute top-2 right-2 z-2 grid size-8 place-items-center rounded-full bg-card text-fg-strong shadow-sm hover:text-error-600"
          >
            <X aria-hidden className="size-4" strokeWidth={2.2} />
          </button>
        )}
      </label>
      {kind === "image" && file && <span className="truncate text-center text-caption font-semibold text-fg-muted">{file.name}</span>}
      {kind === "image" && !file && currentUrl && <span className="text-center text-caption text-fg-muted">Current image — click to replace</span>}
      {kind === "document" && currentHref && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
          <span className="inline-flex items-center gap-1.5 font-semibold text-success-600">
            <FileCheck2 aria-hidden className="size-3.5" strokeWidth={2} />
            {file ? "On file — will be replaced when you save" : "On file"}
          </span>
          <a href={currentHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1 font-semibold max-lg:min-h-11">
            <ExternalLink aria-hidden className="size-3.5" strokeWidth={2} />
            View
          </a>
        </span>
      )}
      {error && (
        <span id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </span>
      )}
    </div>
  );
}
