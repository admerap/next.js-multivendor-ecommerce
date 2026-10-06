import Image from "next/image";
import { cn } from "@/lib/utils";

/** Shop logo on a square tile; falls back to the store initial (self-registered vendors have no logo yet). */
export function StoreAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-16 rounded-lg text-h3 sm:size-24 sm:text-h2" : "size-11 rounded-md text-base";
  if (src) {
    return (
      <span className={cn("relative shrink-0 overflow-hidden border border-line bg-card", box)}>
        <Image src={src} alt={`${name} logo`} fill sizes={size === "lg" ? "(max-width: 639px) 64px, 96px" : "44px"} className="object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center bg-iris-50 font-display font-extrabold text-primary uppercase", box)}>
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
