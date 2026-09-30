/** Joins truthy class names. Swap for clsx + tailwind-merge once shadcn/ui is added. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
