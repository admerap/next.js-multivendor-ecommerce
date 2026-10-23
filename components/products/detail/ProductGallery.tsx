"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Main image + thumbnail strip (thumbnail first, then the additional images). */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-sunken">
        {current ? (
          <Image src={current} alt={active === 0 ? name : `${name} — image ${active + 1}`} fill priority sizes="(max-width: 900px) 100vw, 420px" className="object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-primary">
            <Package aria-hidden className="size-16" strokeWidth={1.4} />
            <span className="sr-only">No image</span>
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul role="list" aria-label="Product images" className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-sunken transition-colors duration-(--dur-fast) max-lg:min-h-11",
                  i === active ? "border-primary" : "border-transparent hover:border-line-default",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
