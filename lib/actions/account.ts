"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validations/account";
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
  const { firstName, lastName, phone, email, currentPassword, newPassword } = parsed.data;
  const name = [firstName, lastName].filter(Boolean).join(" ");

  try {
    const data: Prisma.UserUpdateInput = { name, email, phone: phone || null };

    if (newPassword) {
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      if (!(await bcrypt.compare(currentPassword, current.passwordHash))) {
        const message = "Your current password is incorrect";
        return { ok: false, message, fieldErrors: { currentPassword: message } };
      }
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

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
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated" };
}
