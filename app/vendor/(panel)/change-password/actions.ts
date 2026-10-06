"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { vendorPasswordSchema } from "@/lib/validations/vendor-profile";

export type PasswordActionResult = { success: boolean; error?: string; fieldErrors?: Record<string, string> };

/**
 * Changes the signed-in vendor's own password. The account id comes from the session only, and the
 * current password must be confirmed first. Passwords are bcrypt-hashed and never logged.
 */
export async function changeVendorPassword(input: unknown): Promise<PasswordActionResult> {
  const session = await auth();
  const me = session?.user;
  if (!me || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED") {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  const parsed = vendorPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { success: false, error: "Please fix the highlighted fields", fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!user) return { success: false, error: "Your session has expired. Please sign in again." };
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      const message = "Your current password is incorrect";
      return { success: false, error: message, fieldErrors: { currentPassword: message } };
    }
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    return { success: true };
  } catch (error) {
    console.error("[vendor password] update failed", error instanceof Error ? error.message : "unknown error");
    return { success: false, error: "We couldn't update your password. Please try again." };
  }
}
