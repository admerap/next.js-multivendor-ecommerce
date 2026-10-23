"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PRODUCT_IMAGE_ACCEPT } from "@/lib/validations/product";

/** A new upload (file + blob preview URL) or a saved image (url only). */
export type GalleryItem = { key: string; file?: File; url: string };

function Tile({ item, onRemove }: { item: GalleryItem; onRemove: () => void }) {
  const name = item.file?.name ?? "Saved image";
  return (
    <li className="relative aspect-square overflow-hidden rounded-md border border-line bg-sunken">
      <span role="img" aria-label={name} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${item.url}")` }} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-card text-fg-strong shadow-sm hover:text-error-600 max-lg:size-11"
      >
        <X aria-hidden className="size-4" strokeWidth={2.2} />
      </button>
    </li>
  );
}

/** "Product Additional Images": thumbnails grid + an "Upload or drop" tile (multiple files). */
export function GalleryUpload({ id, items, onChange, max, error }: { id: string; items: GalleryItem[]; onChange: (items: GalleryItem[]) => void; max: number; error?: string }) {
  const [dragging, setDragging] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const room = max - items.length;
    // Preview URLs are made here (not in an effect) and released when the tile is removed.
    const files = [...list].slice(0, Math.max(0, room)).map((file) => ({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) }));
    if (files.length) onChange([...items, ...files]);
  };

  return (
    <ul role="list" aria-label="Additional images" className="grid grid-cols-3 gap-3 xs:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <Tile
          key={item.key}
          item={item}
          onRemove={() => {
            if (item.file) URL.revokeObjectURL(item.url);
            onChange(items.filter((i) => i.key !== item.key));
          }}
        />
      ))}
      {items.length < max && (
        <li>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              add(e.dataTransfer.files);
            }}
            className={cn(
              "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed text-center transition-colors duration-(--dur-fast) hover:border-primary hover:bg-iris-50",
              dragging ? "border-primary bg-iris-50" : error ? "border-error-500" : "border-line-default",
            )}
          >
            <input
              id={id}
              type="file"
              multiple
              accept={PRODUCT_IMAGE_ACCEPT}
              aria-label={`Upload additional images (${items.length} of ${max})`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
            <ImagePlus aria-hidden className="size-5 text-primary" strokeWidth={2} />
            <span className="text-caption font-bold text-primary">Upload</span>
            <span className="text-caption text-fg-muted">or drop</span>
          </label>
        </li>
      )}
    </ul>
  );
}
