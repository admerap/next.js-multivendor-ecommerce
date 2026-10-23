"use client";

import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PRODUCT_IMAGE_ACCEPT } from "@/lib/validations/product";
import { FieldError } from "@/components/forms/FormBits";

const cornerBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-card/90 px-3 text-caption font-semibold shadow-sm backdrop-blur-sm transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-primary max-lg:h-11 max-lg:px-3.5";

/**
 * Product Thumbnail (4:3). Empty: dashed drop zone. With an image: cover preview with "Replace" and
 * "Remove" in the top corner. `src` is what to show (a blob preview of a new file, or the saved
 * image in the edit form); the parent decides what Remove means.
 */
export function ThumbnailDrop({
  label,
  hint,
  src,
  fileName,
  onPick,
  onRemove,
  error,
}: {
  label: string;
  hint: string;
  src: string | null;
  /** name of a newly picked file (shown under the image) */
  fileName?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
  error?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-bold text-fg-strong">
        {label} <span aria-hidden className="text-error-500">*</span>
      </span>
      <span className="text-caption text-fg-muted">{hint}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) onPick(f);
        }}
        className={cn(
          "relative mt-1 aspect-4/3 w-full overflow-hidden rounded-lg border-[1.5px] transition-colors duration-(--dur-fast)",
          src ? "border-solid border-line bg-sunken" : "border-dashed bg-card hover:border-primary hover:bg-iris-50",
          dragging ? "border-primary bg-iris-50" : error ? "border-error-500" : !src && "border-line-default",
        )}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          aria-labelledby={`${id}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={src ? "sr-only" : "absolute inset-0 cursor-pointer opacity-0"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
        {src ? (
          <>
            <span role="img" aria-label={`${label} preview`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => input.current?.click()} className={cn(cornerBtn, "text-fg-strong hover:text-primary")}>
                <RefreshCw aria-hidden className="size-3.5" strokeWidth={2.2} />
                Replace
              </button>
              <button type="button" onClick={onRemove} className={cn(cornerBtn, "text-error-600 hover:bg-error-500 hover:text-on-primary")}>
                <Trash2 aria-hidden className="size-3.5" strokeWidth={2.2} />
                Remove
              </button>
            </div>
          </>
        ) : (
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
            <span className="grid size-10 place-items-center rounded-md bg-iris-50 text-primary">
              <ImagePlus aria-hidden className="size-5" strokeWidth={2} />
            </span>
            <span className="text-caption text-fg">
              <b className="text-primary">Click to upload</b> or drag and drop
            </span>
          </span>
        )}
      </div>
      {fileName && <span className="truncate text-center text-caption font-semibold text-fg-muted">{fileName}</span>}
      <FieldError id={id} error={error} />
    </div>
  );
}
