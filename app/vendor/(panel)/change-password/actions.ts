"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { vendorPasswordSchema } from "@/lib/validations/vendor-profile";

type PasswordField = "oldPassword" | "newPassword" | "confirmPassword";

export type PasswordActionResult = {
  success: boolean;
  error?: string;
  /** First message per field, for inline errors. Never contains a password. */
  fieldErrors?: Partial<Record<PasswordField, string>>;
};

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const WRONG_OLD = "Current password is incorrect";

/**
 * Changes the signed-in vendor's OWN password. The account id comes from the session only (the
 * input has no id field, and any extra keys are stripped by Zod). The old password is checked
 * against the stored bcrypt hash; on success the session is ended server-side so the vendor must
 * sign in again with the new password. Passwords are never logged or returned.
 */
export async function changeVendorPassword(input: unknown): Promise<PasswordActionResult> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED") {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = vendorPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<PasswordField, string>> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as PasswordField] ??= issue.message;
    // Toast the first problem in form order; the rest show inline.
    const first = fieldErrors.oldPassword ?? fieldErrors.newPassword ?? fieldErrors.confirmPassword;
    return { success: false, error: first ?? "Please check the highlighted fields", fieldErrors };
  }
  const { oldPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!user) return { success: false, error: SESSION_EXPIRED };

    if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
      return { success: false, error: WRONG_OLD, fieldErrors: { oldPassword: WRONG_OLD } };
    }

    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  } catch (error) {
    // Only the error class/code — Prisma messages can echo query arguments.
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : error instanceof Error ? error.name : "unknown";
    console.error("[vendor password] update failed:", code);
    return { success: false, error: "We couldn't update your password. Please try again." };
  }

  // Password changed: end this session server-side (clears the session cookie).
  // The client then shows the toast and navigates to /vendor/login.
  await signOut({ redirect: false });
  return { success: true };
}
