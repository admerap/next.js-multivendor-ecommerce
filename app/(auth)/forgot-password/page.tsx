import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { authArea } from "@/lib/validations/auth";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

const LOGIN = { customer: LOGIN_PATH.CUSTOMER, vendor: LOGIN_PATH.VENDOR, admin: LOGIN_PATH.ADMIN } as const;
const EYEBROW = { customer: "Your account", vendor: "Seller Center", admin: "Marketplace staff" } as const;

/**
 * Forgot password (every role; ?area=vendor|admin only picks the back link and wording). Emails a single-use,
 * 30-minute reset link — lib/password-reset.server.
 */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const area = authArea((await searchParams).area);
  return (
    <AuthCard
      icon={KeyRound}
      eyebrow={EYEBROW[area]}
      title="Forgot your password?"
      subtitle="Enter the email you sign in with and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm loginHref={LOGIN[area]} />
    </AuthCard>
  );
}
