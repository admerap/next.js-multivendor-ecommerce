"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset.server";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";

/** Same words whether or not the email has an account — the page never reveals which. */
const SENT = "If an account exists for that email, we've sent a link to reset the password. Check your inbox (and spam).";

/** Forgot password: emails a single-use, 30-minute link (lib/password-reset.server). */
export async function requestPasswordResetAction(input: unknown): Promise<ActionResult | { ok: true; message: string }> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter a valid email address", fieldErrors: { email: "Enter a valid email address" } };
  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    // Logged without the address; the person still sees the neutral answer.
    console.error("[password-reset] request failed", error instanceof Error ? error.name : error);
  }
  return { ok: true, message: SENT };
}

/** Reset password: new password from a valid link → back to that account's login page. */
export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: fieldErrors.token ?? "Please check the highlighted fields", fieldErrors };
  }
  let role;
  try {
    role = await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    console.error("[password-reset] reset failed", error instanceof Error ? error.name : error);
    return { ok: false, message: "We couldn't update your password. Please try again." };
  }
  if (!role) return { ok: false, message: "This reset link has expired or was already used. Request a new one." };
  redirect(`${LOGIN_PATH[role]}?reset=1`);
}
