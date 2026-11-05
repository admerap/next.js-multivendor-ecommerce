import type { Metadata } from "next";
import { AccountCard } from "@/components/account/AccountCard";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { changePasswordAction } from "@/lib/actions/account";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Change Password" };

/** Change Password (account sidebar): the signed-in customer's own password, styled like Profile Info. */
export default async function ChangePasswordPage() {
  await requireArea("CUSTOMER");
  return (
    <AccountCard>
      <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">Change Password</h1>
      <p className="mt-1.5 mb-8 text-sm text-fg-muted">After updating, you&apos;ll be signed out and can sign in with your new password.</p>
      <ChangePasswordForm action={changePasswordAction} signInHref="/login" />
    </AccountCard>
  );
}
