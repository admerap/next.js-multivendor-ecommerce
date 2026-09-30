/** Shared link-as-button styles (DESIGN_SYSTEM §5 Button, md = 44px). `!` beats the base `a { color }` rule. */
const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-(--dur-fast) ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const buttonClasses = {
  primary: `${base} bg-primary !text-on-primary shadow-primary hover:-translate-y-px hover:bg-primary-hover`,
  secondary: `${base} border border-line bg-card !text-fg-strong hover:border-primary hover:!text-primary`,
};
