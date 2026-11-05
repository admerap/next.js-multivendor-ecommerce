import { KeyRound, LinkIcon, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { findResetAccount } from "@/lib/password-reset.server";
import { resetToken } from "@/lib/validations/auth";

// The token rides in the URL: never send it on as a Referer, never index the page.
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer", robots: { index: false } };

/**
 * Reset password (from the emailed link). The link is checked before showing the form: unknown, expired or
 * already used → a clear message and a way to ask for a new one.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const raw = (await searchParams).token;
  const token = resetToken.safeParse(typeof raw === "string" ? raw : "");
  const account = token.success ? await findResetAccount(token.data) : null;

  if (!account) {
    return (
      <AuthCard icon={LinkIcon} title="This link has expired" subtitle="Reset links work once and only for 30 minutes. Ask for a new one and use the latest email we send.">
        <Button asChild className="w-full">
          <Link href="/forgot-password" className="!text-on-primary">
            <Send aria-hidden />
            Send me a new link
          </Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={KeyRound} eyebrow="Password reset" title="Choose a new password" subtitle={`For ${account.email}. At least 8 characters, with a letter and a number.`}>
      <ResetPasswordForm token={token.data!} />
      <p className="mt-4 text-center text-caption text-fg-muted">Saving it signs this account out on every device.</p>
    </AuthCard>
  );
}
