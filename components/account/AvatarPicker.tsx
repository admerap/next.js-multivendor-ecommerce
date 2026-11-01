"use client";

import { Camera, LoaderCircle, Trash2, User } from "lucide-react";
import Image from "next/image";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { removeAvatarAction, updateAvatarAction } from "@/lib/actions/account";
import { AVATAR_TYPES, avatarSchema } from "@/lib/validations/account";
import { cn } from "@/lib/utils";

/**
 * Profile photo (user.dashboard design): the avatar with its camera button. Picking a file uploads it
 * right away — no need to press Update — and the sidebar card follows. The browser checks type and
 * size first for a quick message; the server checks again (by the file's bytes) before saving.
 */
export function AvatarPicker({ image: initial, name }: { image: string | null; name: string }) {
  const [image, setImage] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId();

  function upload(file: File) {
    const check = avatarSchema.safeParse(file);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Choose a valid image");
      return;
    }
    setError(null);
    const data = new FormData();
    data.set("photo", file);
    start(async () => {
      const res = await updateAvatarAction(data).catch(() => ({ ok: false as const, message: "We couldn't upload your photo. Check your connection and try again." }));
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setImage(res.image);
      toast.success(res.message);
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeAvatarAction().catch(() => ({ ok: false as const, message: "We couldn't remove your photo. Please try again." }));
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setImage(null);
      toast.success(res.message);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <span className={cn("relative grid size-30 place-items-center overflow-hidden rounded-full bg-iris-50 transition-opacity", pending && "opacity-60")}>
          {image ? <Image src={image} alt={`${name}'s profile photo`} fill sizes="120px" className="object-cover" /> : <User aria-hidden className="size-16 text-iris-400" strokeWidth={1.6} />}
          {pending && <LoaderCircle aria-hidden className="absolute size-8 animate-spin text-primary" />}
        </span>
        <label
          htmlFor={id}
          title="Change photo"
          className={cn(
            "absolute right-0 bottom-0 grid size-11 cursor-pointer place-items-center rounded-full border-[3px] border-card bg-primary text-on-primary shadow-md transition-colors duration-(--dur-fast) hover:bg-iris-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <Camera aria-hidden className="size-4.5" strokeWidth={2} />
          <input
            id={id}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            aria-label="Change profile photo"
            aria-describedby={error ? `${id}-error` : undefined}
            disabled={pending}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = ""; // picking the same file again still triggers a change
            }}
          />
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="max-w-72 text-center text-caption font-semibold text-error-600">
          {error}
        </p>
      )}
      {image && (
        <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-caption font-semibold text-fg-muted transition-colors duration-(--dur-fast) hover:text-error-600 disabled:opacity-60">
          <Trash2 aria-hidden className="size-3.5" strokeWidth={2} />
          Remove photo
        </button>
      )}
      <p className="text-caption text-fg-subtle">JPG, PNG or WebP · up to 2 MB</p>
    </div>
  );
}
