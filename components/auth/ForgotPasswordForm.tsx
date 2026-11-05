"use client";

import { ArrowLeft, Mail, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { AuthField } from "./AuthField";
import { SubmitButton } from "./SubmitButton";

/**
 * Forgot password: one email field. The answer is the same whether or not the account exists, so after sending
 * it switches to a neutral "check your inbox" panel (with Send again) instead of a success / not-found message.
 */
export function ForgotPasswordForm({ loginHref }: { loginHref: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const send = () => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
    setError("");
    start(async () => {
      const res = await requestPasswordResetAction({ email });
      if (!res.ok) return setError(res.message);
      setSentTo(parsed.data.email);
      setMessage(res.message);
    });
  };

  if (sentTo) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success-50 text-success-600">
          <MailCheck aria-hidden className="size-8" strokeWidth={1.7} />
        </span>
        <p className="font-display text-lg font-bold text-fg-strong">Check your email</p>
        <p className="text-sm text-fg-muted">{message}</p>
        <p className="text-sm text-fg-muted">
          Sent to <b className="break-all text-fg-strong">{sentTo}</b>. The link expires in 30 minutes.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2.5">
          <Button asChild>
            <Link href={loginHref} className="!text-on-primary">
              <ArrowLeft aria-hidden />
              Back to sign in
            </Link>
          </Button>
          <Button variant="ghost" disabled={pending} onClick={send}>
            <Send aria-hidden />
            Didn&apos;t get it? Send again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <AuthField
        label="Email"
        required
        icon={Mail}
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError("");
        }}
        error={error}
      />
      <SubmitButton pending={pending} icon={Send} pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
      <Link href={loginHref} className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold">
        <ArrowLeft aria-hidden className="size-4" />
        Back to sign in
      </Link>
    </form>
  );
}
