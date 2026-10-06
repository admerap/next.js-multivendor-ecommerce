import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** tailwind-merge taught Sundry's custom tokens so they are not mistaken for colours and dropped. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "caption"],
      shadow: ["primary"],
    },
  },
});

/** Class composition: clsx for conditionals, tailwind-merge so later classes win (CLAUDE.md §8). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
