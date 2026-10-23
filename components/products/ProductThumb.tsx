import { Package } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Square product thumbnail (52px in the list); a package glyph on a tinted tile when there's no image. */
export function ProductThumb({ src, name, size = 52, className }: { src: string | null; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-line", src ? "bg-card" : "bg-iris-50", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Package aria-hidden className="size-1/2 text-primary" strokeWidth={1.7} />
      )}
    </span>
  );
}
