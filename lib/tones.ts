/** Semantic tones → token utilities (DESIGN_SYSTEM §6 status colors). */
export type Tone = "iris" | "info" | "success" | "saffron" | "warning" | "error" | "neutral";

export const toneClasses: Record<Tone, { bg: string; fg: string; dot: string }> = {
  iris: { bg: "bg-iris-50", fg: "text-primary", dot: "bg-primary" },
  info: { bg: "bg-info-50", fg: "text-info-600", dot: "bg-info-600" },
  success: { bg: "bg-success-50", fg: "text-success-600", dot: "bg-success-600" },
  saffron: { bg: "bg-saffron-50", fg: "text-saffron-700", dot: "bg-accent" },
  warning: { bg: "bg-warning-50", fg: "text-warning-600", dot: "bg-warning-600" },
  error: { bg: "bg-error-50", fg: "text-error-600", dot: "bg-error-600" },
  neutral: { bg: "bg-sunken", fg: "text-fg-muted", dot: "bg-fg-muted" },
};
