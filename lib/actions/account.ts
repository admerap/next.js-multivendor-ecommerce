"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { changeOwnPassword, type PasswordActionResult } from "@/lib/password.server";
import { deleteUserImage, saveUserImage, UploadError } from "@/lib/uploads";
import { AVATAR_MAX_BYTES, avatarSchema, profileSchema } from "@/lib/validations/account";
import type { ActionResult } from "./auth";

export type ProfileResult = ActionResult | { ok: true; message: string };

const EMAIL_TAKEN = "An account with this email already exists";

export async function updateProfileAction(input: unknown): Promise<ProfileResult> {
  // Always act on the signed-in customer; never trust an id from the client.
  const user = await requireArea("CUSTOMER");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Please fix the highlighted fields", fieldErrors };
  }
  const { firstName, lastName, countryCode, phone: national, email } = parsed.data;
  const phone = national ? `${countryCode} ${national}` : "";
  const name = [firstName, lastName].filter(Boolean).join(" ");

  try {
    // Profile fields only — the password has its own card and action (changePasswordAction).
    const data: Prisma.UserUpdateInput = { name, email, phone: phone || null };

    if (email !== user.email && (await prisma.user.count({ where: { email, NOT: { id: user.id } } }))) {
      return { ok: false, message: EMAIL_TAKEN, fieldErrors: { email: EMAIL_TAKEN } };
    }

    await prisma.user.update({ where: { id: user.id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: EMAIL_TAKEN, fieldErrors: { email: EMAIL_TAKEN } };
    }
    console.error("[account] profile update failed", error);
    return { ok: false, message: "We couldn't save your profile. Please try again." };
  }

  // Keep the JWT's name/email in step with the database.
  await unstable_update({ user: { name, email } });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile updated" };
}

/**
 * Change Password card: the signed-in customer's OWN password (id from the session). Same core as the
 * vendor (lib/password.server): old password checked, new ≠ old, confirmation matches, then the session
 * ends — the client sends the customer to /login to sign in with the new password.
 */
export async function changePasswordAction(input: unknown): Promise<PasswordActionResult> {
  const user = await requireArea("CUSTOMER");
  return changeOwnPassword(user.id, input, "customer");
}

export type AvatarResult ={ ok: true; image: string | null; message: string } | { ok: false; message: string };

/**
 * Camera button on the avatar: saves the new photo for the signed-in customer and deletes the old
 * file once the row points at the new one. The file is re-checked by its bytes (lib/uploads).
 */
export async function updateAvatarAction(formData: FormData): Promise<AvatarResult> {
  const user = await requireArea("CUSTOMER");
  const parsed = avatarSchema.safeParse(formData.get("photo"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Choose a valid image" };

  let saved: string | null = null;
  try {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } });
    saved = await saveUserImage(parsed.data, AVATAR_MAX_BYTES);
    await prisma.user.update({ where: { id: user.id }, data: { image: saved } });
    await deleteUserImage(current.image);
  } catch (error) {
    if (saved) await deleteUserImage(saved); // no orphan file when the update failed
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[account] avatar update failed", error);
    return { ok: false, message: "We couldn't save your photo. Please try again." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, image: saved, message: "Profile photo updated" };
}

/** "Remove photo": back to the default avatar; the stored file is deleted. */
export async function removeAvatarAction(): Promise<AvatarResult> {
  const user = await requireArea("CUSTOMER");
  try {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } });
    if (current.image) {
      await prisma.user.update({ where: { id: user.id }, data: { image: null } });
      await deleteUserImage(current.image);
    }
  } catch (error) {
    console.error("[account] avatar removal failed", error);
    return { ok: false, message: "We couldn't remove your photo. Please try again." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, image: null, message: "Profile photo removed" };
}
