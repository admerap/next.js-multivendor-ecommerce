"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";
import { getAccess } from "@/lib/access.server";
import { clearFailures, lockedFor, lockedMessage, recordFailure } from "@/lib/attempts.server";
import { prisma } from "@/lib/db";
import { changeOwnPassword, SESSION_EXPIRED, type PasswordActionResult } from "@/lib/password.server";
import { deleteUserImage, saveUserImage, UploadError } from "@/lib/uploads";
import { STAFF_IMAGE_MAX_BYTES, staffImageSchema, staffProfileSchema } from "@/lib/validations/admin-user";

export type ProfileResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string> };

const CHECK = "Please check the highlighted fields";
const EMAIL_TAKEN = "An account with this email already exists";

/**
 * Admin › Profile › Save: the signed-in admin's OWN name, phone, email and photo — the id comes from the session,
 * a new email also needs the current password —
 * never from the form, and no permission is needed (everyone may keep their own profile up to date). Role and
 * status aren't here: whoever manages users sets those. The photo is optional, checked by its bytes, and the old
 * file is deleted once the row points at the new one.
 */
export async function updateMyProfileAction(form: FormData): Promise<ProfileResult> {
  const me = await getAccess();
  if (!me) return { success: false, error: SESSION_EXPIRED };
  const parsed = staffProfileSchema.safeParse({
    firstName: String(form.get("firstName") ?? ""),
    lastName: String(form.get("lastName") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { success: false, error: CHECK, fieldErrors };
  }
  const file = form.get("image");
  const photo = file instanceof File && file.size > 0 ? staffImageSchema.safeParse(file) : null;
  if (photo && !photo.success) return { success: false, error: CHECK, fieldErrors: { image: photo.error.issues[0]?.message ?? "Choose a valid image" } };
  const removeImage = form.get("removeImage") === "1";
  const { firstName, lastName, phone, email } = parsed.data;
  const name = `${firstName} ${lastName}`;

  let saved: string | null = null;
  try {
    const current = await prisma.user.findUnique({ where: { id: me.userId }, select: { image: true, email: true, passwordHash: true } });
    if (!current) return { success: false, error: SESSION_EXPIRED };
    // Emails stay unique across live and deleted accounts.
    if (await prisma.user.count({ where: { email, NOT: { id: me.userId } } })) return { success: false, error: CHECK, fieldErrors: { email: EMAIL_TAKEN } };
    // Changing the email (the sign-in name) needs the current password, so an unattended open session can't
    // hand the account to someone else. Wrong guesses count toward the same lock as Change Password.
    if (email !== current.email) {
      const key = `pw:${me.userId}`;
      const wait = await lockedFor(key);
      if (wait) return { success: false, error: lockedMessage(wait), fieldErrors: { currentPassword: lockedMessage(wait) } };
      const typed = String(form.get("currentPassword") ?? "");
      if (!typed) return { success: false, error: CHECK, fieldErrors: { currentPassword: "Enter your current password to change your email" } };
      if (!(await bcrypt.compare(typed, current.passwordHash))) {
        await recordFailure(key);
        return { success: false, error: CHECK, fieldErrors: { currentPassword: "Current password is incorrect" } };
      }
      await clearFailures(key);
    }
    if (photo?.success) saved = await saveUserImage(photo.data, STAFF_IMAGE_MAX_BYTES);
    await prisma.user.update({
      where: { id: me.userId },
      data: { name, email, phone: phone || null, ...(saved ? { image: saved } : removeImage && { image: null }) },
    });
    if (saved || removeImage) await deleteUserImage(current.image);
  } catch (error) {
    if (saved) await deleteUserImage(saved); // no orphan file when the update failed
    if (error instanceof UploadError) return { success: false, error: CHECK, fieldErrors: { image: error.message } };
    if ((error as { code?: string }).code === "P2002") return { success: false, error: CHECK, fieldErrors: { email: EMAIL_TAKEN } };
    console.error("[admin-profile] update failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't save your profile. Please try again." };
  }

  // Keep the session's name/email in step with the database; the header reads both fresh.
  await unstable_update({ user: { name, email } });
  revalidatePath("/admin", "layout");
  return { success: true, message: "Profile updated" };
}

/**
 * Admin › Profile › Change Password: the signed-in admin's OWN password. Same core as customers and vendors
 * (lib/password.server): current password checked, new ≠ current, confirmation matches, then the session ends
 * and the page sends them to the admin sign-in.
 */
export async function changeMyPasswordAction(input: unknown): Promise<PasswordActionResult> {
  const me = await getAccess();
  if (!me) return { success: false, error: SESSION_EXPIRED };
  return changeOwnPassword(me.userId, input, "admin");
}
