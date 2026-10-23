"use client";

import { Package, Share2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

/**
 * Product page gallery (Product Detail Page design): square main image with the discount badge and a
 * share button, thumbnails below. Zoom follows the pointer on hover (mouse only — PRD FR-S16).
 * Controlled: the parent owns which image is shown, so picking a variation can switch to its photo.
 */
export function ProductGallery({
  images,
  name,
  badge,
  shown,
  onShow,
}: {
  images: string[];
  name: string;
  /** "−35%" or null */
  badge: string | null;
  shown: number;
  onShow: (index: number) => void;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const index = Math.min(shown, Math.max(0, images.length - 1));
  const main = images[index];

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (e) {
      // Closing the native share sheet is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error("Couldn't share this product. Copy the link from the address bar.");
    }
  }

  return (
    <div className="min-w-0 flex-[1_1_320px]">
      <div
        className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-iris-50"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !main) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setZoom(null)}
      >
        {main ? (
          <Image
            src={main}
            alt={images.length > 1 ? `${name} — image ${index + 1} of ${images.length}` : name}
            fill
            priority
            sizes="(max-width: 720px) 92vw, (max-width: 1200px) 45vw, 440px"
            className={cn("object-cover transition-transform duration-(--dur-fast) ease-out", zoom && "scale-175")}
            // Runtime value: the zoom follows the pointer.
            style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <Package aria-hidden className="size-20 text-iris-400" strokeWidth={1.4} />
        )}
        {badge && <span className="absolute top-4 left-4 z-10 rounded-sm bg-primary px-2.5 py-1 text-caption font-bold text-on-primary tabular-nums">{badge}</span>}
        <button
          type="button"
          onClick={share}
          aria-label="Share this product"
          className="absolute top-4 right-4 z-10 grid size-9.5 place-items-center rounded-full bg-card/90 text-fg shadow-xs backdrop-blur-md transition-colors duration-(--dur-fast) hover:text-primary max-lg:size-11"
        >
          <Share2 aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </div>

      {images.length > 1 && (
        <div role="group" aria-label="Product images" className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onShow(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              className={cn(
                "relative size-18 overflow-hidden rounded-md border-2 bg-sunken transition-colors duration-(--dur-fast)",
                i === index ? "border-primary" : "border-line hover:border-primary",
              )}
            >
              <Image src={src} alt="" fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
