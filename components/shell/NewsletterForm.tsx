"use client";

import { Send } from "lucide-react";
import toast from "react-hot-toast";

/** Footer newsletter sign-up. Subscriptions aren't stored yet, so we say so instead of faking success. */
export function NewsletterForm() {
  return (
    <form
      className="flex overflow-hidden rounded-full bg-on-primary/8"
      onSubmit={(e) => {
        e.preventDefault();
        toast("Newsletter sign-up opens soon — thanks for your interest!");
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Your email address"
        className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-on-primary outline-none placeholder:text-fg-muted"
      />
      <button type="submit" className="flex items-center gap-1.5 bg-primary px-4.5 text-caption font-semibold text-on-primary hover:bg-primary-hover">
        <Send aria-hidden className="size-3.5" strokeWidth={2} />
        Subscribe
      </button>
    </form>
  );
}
