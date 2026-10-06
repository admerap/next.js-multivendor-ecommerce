import { Tag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Square brand logo on a sunken tile; falls back to a tag glyph when there is no image. */
export function BrandThumb({ src, name, size = 52, className }: { src: string | null; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sunken", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={`${name} logo`} fill sizes={`${size}px`} className="object-contain p-1.5" />
      ) : (
        <Tag aria-hidden className="size-1/2 text-fg-subtle" strokeWidth={1.6} />
      )}
    </span>
  );
}
