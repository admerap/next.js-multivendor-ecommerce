import Image from "next/image";
import { initialsOf } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Round avatar for a chat party: their photo / store logo, else initials on a tinted disc. */
export function ChatAvatar({ name, image, size = 44, className }: { name: string; image: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-iris-100 font-bold text-primary", className)}
      // runtime value: the avatar size
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {image ? <Image src={image} alt="" fill sizes={`${size}px`} className="bg-card object-cover" /> : <span aria-hidden>{initialsOf(name)}</span>}
    </span>
  );
}
