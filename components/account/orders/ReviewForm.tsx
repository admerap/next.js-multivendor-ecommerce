"use client";

import { ImagePlus, Send, Star, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";
import { REVIEW_COMMENT_MAX, REVIEW_PHOTO_TYPES, REVIEW_PHOTOS_MAX, REVIEW_TITLE_MAX, reviewSchema } from "@/lib/validations/review";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const field = "w-full rounded-md border bg-card px-3.5 text-sm text-fg-strong placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

/**
 * Review form for one purchased item (order details › Reviews): stars (a radio group — arrow keys
 * work), optional title, comment and up to 3 photos. Zod checks it here for instant feedback; the
 * server re-checks everything, including that the item is this customer's and was delivered.
 */
export function ReviewForm({ orderItemId, productName }: { orderItemId: string; productName: string }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const check = reviewSchema.safeParse({ orderItemId, rating, title, comment, photos });
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const i of check.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      toast.error(Object.values(next)[0] ?? "Please check your review");
      return;
    }
    const data = new FormData();
    data.set("orderItemId", orderItemId);
    data.set("rating", String(rating));
    data.set("title", title);
    data.set("comment", comment);
    for (const p of photos) data.append("photos", p);
    start(async () => {
      const res = await submitReview(data).catch(() => ({ ok: false as const, message: "We couldn't reach the store. Please try again.", fieldErrors: undefined }));
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
    });
  }

  const shown = hover || rating;
  return (
    <form noValidate onSubmit={submit} aria-label={`Review ${productName}`} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-1.5 text-caption font-semibold text-fg">
          Your rating <span className="text-error-500">*</span>
        </legend>
        <div role="radiogroup" aria-label="Rating" aria-describedby={errors.rating ? `${id}-rating` : undefined} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={`${id}-rating`}
                value={n}
                checked={rating === n}
                onChange={() => {
                  setRating(n);
                  clear("rating");
                }}
                aria-label={`${n} star${n > 1 ? "s" : ""} — ${WORDS[n]}`}
                className="sr-only"
              />
              <Star aria-hidden className={cn("size-7 transition-colors duration-(--dur-fast)", n <= shown ? "fill-warning-500 text-warning-500" : "text-line-default")} strokeWidth={1.6} />
            </label>
          ))}
          <span className="ml-2 text-sm font-semibold text-fg-muted" aria-live="polite">
            {WORDS[shown]}
          </span>
        </div>
        {errors.rating && (
          <p id={`${id}-rating`} role="alert" className="mt-1 text-caption font-semibold text-error-600">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${id}-title`} className="mb-1.5 block text-caption font-semibold text-fg">
          Title <span className="font-normal text-fg-subtle">(optional)</span>
        </label>
        <input
          id={`${id}-title`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            clear("title");
          }}
          maxLength={REVIEW_TITLE_MAX}
          placeholder="Sum it up in a few words"
          aria-invalid={!!errors.title}
          className={cn(field, "h-11", errors.title ? "border-error-500" : "border-line")}
        />
        {errors.title && <p className="mt-1 text-caption font-semibold text-error-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor={`${id}-comment`} className="mb-1.5 block text-caption font-semibold text-fg">
          Your review <span className="text-error-500">*</span>
        </label>
        <textarea
          id={`${id}-comment`}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX));
            clear("comment");
          }}
          rows={4}
          placeholder="What did you like or dislike? How was the quality?"
          aria-invalid={!!errors.comment}
          aria-describedby={errors.comment ? `${id}-comment-error` : undefined}
          className={cn(field, "resize-y py-3", errors.comment ? "border-error-500" : "border-line")}
        />
        <div className="mt-1 flex justify-between gap-3 text-caption">
          <span id={`${id}-comment-error`} role={errors.comment ? "alert" : undefined} className="font-semibold text-error-600">
            {errors.comment}
          </span>
          <span className="text-fg-subtle tabular-nums">
            {comment.length}/{REVIEW_COMMENT_MAX}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-caption font-semibold text-fg">
          Photos <span className="font-normal text-fg-subtle">(optional · up to {REVIEW_PHOTOS_MAX}, JPG / PNG / WebP, 2 MB each)</span>
        </p>
        <div className="flex flex-wrap gap-2.5">
          {previews.map((src, i) => (
            <span key={src} className="relative size-20 overflow-hidden rounded-md border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-0.5 right-0.5 grid size-11 place-items-start justify-items-end p-1"
              >
                <span className="grid size-6 place-items-center rounded-full bg-fg-strong/70 text-on-primary">
                  <X aria-hidden className="size-3.5" strokeWidth={2.4} />
                </span>
              </button>
            </span>
          ))}
          {photos.length < REVIEW_PHOTOS_MAX && (
            <label className="grid size-20 cursor-pointer place-items-center rounded-md border border-dashed border-line-default text-fg-muted transition-colors duration-(--dur-fast) hover:border-primary hover:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
              <ImagePlus aria-hidden className="size-6" strokeWidth={1.7} />
              <input
                type="file"
                accept={REVIEW_PHOTO_TYPES.join(",")}
                multiple
                aria-label="Add photos"
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  setPhotos((p) => [...p, ...files].slice(0, REVIEW_PHOTOS_MAX));
                  clear("photos");
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {errors.photos && (
          <p role="alert" className="mt-1 text-caption font-semibold text-error-600">
            {errors.photos}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={pending} aria-busy={pending} className="max-sm:w-full">
          <Send aria-hidden />
          {pending ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
