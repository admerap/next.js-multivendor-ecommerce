import { z } from "zod";

/** Review form (order details › Reviews). Shared by the form (instant feedback) and submitReview. */

export const REVIEW_TITLE_MAX = 120;
export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 2000;
export const REVIEW_PHOTOS_MAX = 3;
export const REVIEW_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const photo = z
  .file()
  .min(1, "A photo is empty")
  .max(REVIEW_PHOTO_MAX_BYTES, "Each photo must be 2 MB or smaller")
  .mime([...REVIEW_PHOTO_TYPES], "Photos must be JPG, PNG or WebP");

export const reviewSchema = z.object({
  /** The purchased line being reviewed — the product is read from it on the server, never trusted from the form. */
  orderItemId: z.string().trim().min(1).max(40),
  rating: z.coerce.number("Choose a star rating").int().min(1, "Choose a star rating").max(5, "Choose a star rating"),
  title: z
    .string()
    .trim()
    .max(REVIEW_TITLE_MAX, `Keep the title under ${REVIEW_TITLE_MAX} characters`)
    .transform((v) => v || null),
  comment: z
    .string()
    .trim()
    .min(1, "Tell other shoppers what you think")
    .min(REVIEW_COMMENT_MIN, `Write at least ${REVIEW_COMMENT_MIN} characters`)
    .max(REVIEW_COMMENT_MAX, `Keep it under ${REVIEW_COMMENT_MAX} characters`),
  photos: z.array(photo).max(REVIEW_PHOTOS_MAX, `Add up to ${REVIEW_PHOTOS_MAX} photos`).default([]),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const REVIEW_STATUS_LABEL = { PENDING: "Pending approval", APPROVED: "Published", REJECTED: "Denied" } as const;
