"use client";

import { CircleAlert, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  error?: string;
  icon?: LucideIcon;
  /** md = 50px (storefront forms), lg = 56px (Seller Center login). */
  size?: "md" | "lg";
  /** Rendered at the right end of the label row (e.g. a link). */
  labelAside?: ReactNode;
  /** Rendered inside the input frame before the text (e.g. a country-code select). */
  leading?: ReactNode;
  /** Rendered inside the input frame after the text (e.g. show/hide password). */
  trailing?: ReactNode;
  /** Show the circle-alert glyph before error text (storefront style). */
  errorIcon?: boolean;
};

export function AuthField({
  label,
  error,
  icon: Icon,
  size = "md",
  labelAside,
  leading,
  trailing,
  errorIcon = true,
  required,
  id,
  className,
  ...input
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className={cn("font-semibold text-fg", size === "lg" ? "text-sm" : "text-caption")}
        >
          {label}
          {required && <span aria-hidden className="text-error-500"> *</span>}
        </label>
        {labelAside}
      </div>
      <div
        className={cn(
          "flex items-center rounded-md bg-card pr-1.5 transition-[border-color,box-shadow] duration-(--dur-fast)",
          size === "lg" ? "h-13 pl-4" : "h-12 pl-3.5",
          error
            ? "border-[1.5px] border-error-500 shadow-[0_0_0_3px_var(--error-50)]"
            : "border border-line focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]",
        )}
      >
        {Icon && <Icon aria-hidden className="size-[18px] shrink-0 text-fg-muted" strokeWidth={1.9} />}
        {leading}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-full min-w-0 flex-1 border-none bg-transparent text-fg-strong outline-none placeholder:text-fg-subtle",
            Icon || leading ? "px-2.5" : "pr-2.5",
            size === "lg" ? "text-[0.9375rem]" : "text-sm",
            className,
          )}
          {...input}
        />
        {trailing}
      </div>
      {error && (
        <span id={errorId} className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
          {errorIcon && <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />}
          {error}
        </span>
      )}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type" | "trailing"> & {
  /** Controlled visibility, so paired fields (password + confirm) toggle together. */
  visible?: boolean;
  onToggleVisible?: () => void;
};

export function PasswordField({ visible, onToggleVisible, size, ...props }: PasswordFieldProps) {
  const [ownVisible, setOwnVisible] = useState(false);
  const shown = visible ?? ownVisible;
  const toggle = onToggleVisible ?? (() => setOwnVisible((v) => !v));
  const EyeIcon = shown ? EyeOff : Eye;

  return (
    <AuthField
      {...props}
      size={size}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:text-fg-strong focus-visible:outline-2 focus-visible:outline-primary"
        >
          <EyeIcon aria-hidden className="size-[18px]" strokeWidth={1.9} />
        </button>
      }
    />
  );
}
