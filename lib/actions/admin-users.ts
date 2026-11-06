"use server";

import bcrypt from "bcryptjs";
import type { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAccess, noPermissionResult } from "@/lib/access.server";
import { diff, logAudit } from "@/lib/audit.server";
import { prisma } from "@/lib/db";
import { covers, toPermissions } from "@/lib/permissions";
import { deleteUserImage, saveUserImage, UploadError } from "@/lib/uploads";
import { createStaffUserSchema, STAFF_IMAGE_MAX_BYTES, staffImageSchema, updateStaffUserSchema, userIdSchema } from "@/lib/validations/admin-user";

export type StaffUserResult =
  | { success: true; name: string; /** restore: their role was deleted meanwhile, so they came back with none */ roleCleared?: boolean }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const FORBIDDEN: StaffUserResult = { success: false, error: "You don't have access to do that." };
const NO_PERMISSION: StaffUserResult = noPermissionResult;
const SUPER_ONLY_RESTORE: StaffUserResult = { success: false, error: "Only a Super Admin can restore deleted users." };
const GONE: StaffUserResult = { success: false, error: "This user no longer exists. Refresh the page." };
const CHECK = "Please check the highlighted fields";
const fieldError = (field: string, message: string): StaffUserResult => ({ success: false, error: CHECK, fieldErrors: { [field]: message } });
const EMAIL_TAKEN = fieldError("email", "An account with this email already exists");
const EMAIL_TAKEN_BY_DELETED = fieldError("email", "A deleted user has this email. Restore it from Deleted users.");
const BAD_ROLE = fieldError("role", "Select a role from the list");
const ROLE_TOO_STRONG = fieldError("role", "You can't give a role with more access than your own");

function invalid(error: z.ZodError): StaffUserResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { success: false, error: CHECK, fieldErrors };
}

const FIELDS = ["id", "role", "firstName", "lastName", "phone", "email", "status", "password"] as const;
/** The modal posts FormData (it can carry a photo): plain fields as strings, plus `image` and `removeImage`. */
function readForm(form: FormData) {
  const values: Record<string, string> = {};
  for (const k of FIELDS) values[k] = String(form.get(k) ?? "");
  const file = form.get("image");
  return { values, image: file instanceof File && file.size > 0 ? file : null, removeImage: form.get("removeImage") === "1" };
}

/** Who is acting: an admin with an id, whether they hold the Super Admin role, and their role's permissions. */
async function signer() {
  const access = await getAccess();
  if (!access) return null;
  return { id: access.userId, isSuper: access.isSuper, perms: access.permissions };
}

/**
 * The role must be live and active; only a Super Admin can give the Super Admin role, and anyone else only a role
 * whose permissions are all within their own (no handing out more access than you have).
 */
type Signer = NonNullable<Awaited<ReturnType<typeof signer>>>;
const PERM_FIELDS = { module: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true } as const;

async function roleCheck(roleId: string, me: Signer): Promise<StaffUserResult | null> {
  const role = await prisma.adminRole.findFirst({
    where: { id: roleId, deletedAt: null, isActive: true },
    select: { isSystem: true, permissions: { select: PERM_FIELDS } },
  });
  if (!role || (role.isSystem && !me.isSuper)) return BAD_ROLE;
  if (!me.isSuper && !covers(me.perms, toPermissions(role.permissions))) return ROLE_TOO_STRONG;
  return null;
}

/** A non-Super Admin acting on an account whose role has access they lack (they could take it over). */
const OUTRANKED: StaffUserResult = { success: false, error: "This account has more access than your role. Ask a Super Admin." };
function outranks(role: { isSystem: boolean; permissions: Parameters<typeof toPermissions>[0] } | null, me: Signer) {
  if (me.isSuper || !role) return false;
  return role.isSystem || !covers(me.perms, toPermissions(role.permissions));
}

/** Emails stay unique across live and deleted users, so one held by a deleted user points to restoring it. */
async function emailTaken(email: string, exceptId?: string) {
  const clash = await prisma.user.findFirst({ where: { email, ...(exceptId && { id: { not: exceptId } }) }, select: { deletedAt: true } });
  return clash ? (clash.deletedAt ? EMAIL_TAKEN_BY_DELETED : EMAIL_TAKEN) : null;
}

const refresh = () => revalidatePath("/admin/users");

/** A role's name for the Activity Log ("—" if it's gone). */
const roleName = async (id: string) => (await prisma.adminRole.findUnique({ where: { id }, select: { name: true } }))?.name ?? "—";

/**
 * Users › New User: creates an admin-panel account (role ADMIN). Needs Users › Create; every field validated on the
 * server; the role must be one the signer may give (see `assignableRoles`); the email must be free; the password
 * is stored as a bcrypt hash and never logged; the photo is optional. Status Inactive creates it blocked.
 */
export async function createStaffUserAction(form: FormData): Promise<StaffUserResult> {
  const me = await signer();
  if (!me) return FORBIDDEN;
  if (!me.perms.users.create) return NO_PERMISSION;
  const { values, image } = readForm(form);
  const parsed = createStaffUserSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const photo = image ? staffImageSchema.safeParse(image) : null;
  if (photo && !photo.success) return fieldError("image", photo.error.issues[0]?.message ?? "Choose a valid image");
  const { role, firstName, lastName, email, phone, status, password } = parsed.data;

  let saved: string | null = null;
  try {
    const roleProblem = await roleCheck(role, me);
    if (roleProblem) return roleProblem;
    const taken = await emailTaken(email);
    if (taken) return taken;
    if (photo?.success) saved = await saveUserImage(photo.data, STAFF_IMAGE_MAX_BYTES);
    const name = `${firstName} ${lastName}`;
    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        image: saved,
        role: "ADMIN",
        adminRoleId: role,
        passwordHash: await bcrypt.hash(password, 12),
        blockedAt: status === "inactive" ? new Date() : null,
      },
      select: { id: true },
    });
    await logAudit({
      action: "user.create",
      entityType: "user",
      entityId: created.id,
      entityLabel: `${name} (${email})`,
      changes: { Role: ["—", await roleName(role)], Status: ["—", status === "active" ? "Active" : "Inactive"] },
    });
    refresh();
    return { success: true, name };
  } catch (error) {
    if (saved) await deleteUserImage(saved); // no orphan file when the insert failed
    if (error instanceof UploadError) return fieldError("image", error.message);
    if ((error as { code?: string }).code === "P2002") return EMAIL_TAKEN;
    console.error("[admin-users] create failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't create the user. Please try again." };
  }
}

/**
 * Users › Edit: same rules as New User; the password changes only when one is typed (and then every open session
 * of that user ends). Editing someone else needs Users › Update (your own account you can always edit), and a
 * non-Super Admin can't touch a Super Admin or an account whose role has more access than theirs. Nobody
 * changes their own role or switches themselves off (they'd lock themselves out), and the last Super Admin
 * can't lose the role.
 */
export async function updateStaffUserAction(form: FormData): Promise<StaffUserResult> {
  const me = await signer();
  if (!me) return FORBIDDEN;
  const { values, image, removeImage } = readForm(form);
  const parsed = updateStaffUserSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const photo = image ? staffImageSchema.safeParse(image) : null;
  if (photo && !photo.success) return fieldError("image", photo.error.issues[0]?.message ?? "Choose a valid image");
  const { id, role, firstName, lastName, email, phone, status, password } = parsed.data;
  if (id !== me.id && !me.perms.users.update) return NO_PERMISSION;

  let saved: string | null = null;
  try {
    const user = await prisma.user.findFirst({
      where: { id, role: "ADMIN", deletedAt: null },
      select: {
        name: true,
        email: true,
        phone: true,
        image: true,
        blockedAt: true,
        adminRoleId: true,
        adminRole: { select: { name: true, isSystem: true, permissions: { select: PERM_FIELDS } } },
      },
    });
    if (!user) return GONE;
    const targetIsSuper = !!user.adminRole?.isSystem;
    if (targetIsSuper && !me.isSuper) return { success: false, error: "Only a Super Admin can edit a Super Admin." };
    if (id !== me.id && outranks(user.adminRole, me)) return OUTRANKED;
    if (id === me.id) {
      if (role !== user.adminRoleId) return fieldError("role", "You can't change your own role");
      if (status !== "active") return fieldError("status", "You can't switch off your own account");
    }
    if (role !== user.adminRoleId) {
      const roleProblem = await roleCheck(role, me);
      if (roleProblem) return roleProblem;
      if (targetIsSuper) {
        const others = await prisma.user.count({ where: { id: { not: id }, role: "ADMIN", deletedAt: null, adminRole: { isSystem: true } } });
        if (others === 0) return fieldError("role", "There must always be one Super Admin");
      }
    }
    const taken = await emailTaken(email, id);
    if (taken) return taken;
    if (photo?.success) saved = await saveUserImage(photo.data, STAFF_IMAGE_MAX_BYTES);
    const name = `${firstName} ${lastName}`;
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null,
        adminRoleId: role,
        // Keep the original "since" date while it stays inactive.
        blockedAt: status === "inactive" ? (user.blockedAt ?? new Date()) : null,
        ...(password && { passwordHash: await bcrypt.hash(password, 12) }),
        ...(saved ? { image: saved } : removeImage && { image: null }),
      },
    });
    if (saved || removeImage) await deleteUserImage(user.image);
    await logAudit({
      action: "user.update",
      entityType: "user",
      entityId: id,
      entityLabel: `${name} (${email})`,
      changes: {
        ...diff(
          {
            Name: user.name,
            Email: user.email,
            Phone: user.phone ?? "",
            Role: user.adminRole?.name ?? "No role",
            Status: user.blockedAt ? "Inactive" : "Active",
          },
          {
            Name: name,
            Email: email,
            Phone: phone,
            Role: role === user.adminRoleId ? (user.adminRole?.name ?? "No role") : await roleName(role),
            Status: status === "active" ? "Active" : "Inactive",
          },
        ),
        ...(password && { Password: ["•••", "changed"] as [string, string] }),
        ...(saved
          ? { Photo: [user.image ? "photo" : "—", "new photo"] as [string, string] }
          : removeImage && user.image
            ? { Photo: ["photo", "removed"] as [string, string] }
            : {}),
      },
    });
    refresh();
    return { success: true, name };
  } catch (error) {
    if (saved) await deleteUserImage(saved);
    if (error instanceof UploadError) return fieldError("image", error.message);
    if ((error as { code?: string }).code === "P2002") return EMAIL_TAKEN;
    console.error("[admin-users] update failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't save the user. Please try again." };
  }
}

/**
 * Users › Delete (soft): the account disappears from the list and can't sign in (an open session ends on its
 * next request), but the row stays — with when and who — and can be restored. Needs Users › Delete; nobody deletes
 * their own account, a Super Admin can never be deleted, and a non-Super Admin can't delete an account whose
 * role has more access than theirs.
 */
export async function deleteStaffUserAction(input: unknown): Promise<StaffUserResult> {
  const me = await signer();
  if (!me) return FORBIDDEN;
  if (!me.perms.users.delete) return NO_PERMISSION;
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  const { id } = parsed.data;
  if (id === me.id) return { success: false, error: "You can't delete your own account." };
  try {
    const user = await prisma.user.findFirst({
      where: { id, role: "ADMIN", deletedAt: null },
      select: { name: true, email: true, adminRole: { select: { isSystem: true, permissions: { select: PERM_FIELDS } } } },
    });
    if (!user) return GONE;
    if (user.adminRole?.isSystem) return { success: false, error: "A Super Admin can't be deleted." };
    if (outranks(user.adminRole, me)) return OUTRANKED;
    const r = await prisma.user.updateMany({ where: { id, role: "ADMIN", deletedAt: null }, data: { deletedAt: new Date(), deletedById: me.id } });
    if (r.count === 0) return GONE;
    await logAudit({ action: "user.delete", entityType: "user", entityId: id, entityLabel: `${user.name} (${user.email})` });
    refresh();
    return { success: true, name: user.name };
  } catch (error) {
    console.error("[admin-users] delete failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't delete the user. Please try again." };
  }
}

/** Users › Deleted › Restore (Super Admin only — bringing an account back is their call): the account is back in the list with its role and status, and can sign in again (if active). */
export async function restoreStaffUserAction(input: unknown): Promise<StaffUserResult> {
  const me = await signer();
  if (!me) return FORBIDDEN;
  if (!me.isSuper) return SUPER_ONLY_RESTORE;
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const user = await prisma.user.findFirst({
      where: { id: parsed.data.id, role: "ADMIN", deletedAt: { not: null } },
      select: { name: true, email: true, adminRole: { select: { name: true, deletedAt: true } } },
    });
    if (!user) return GONE;
    // A role deleted while they were away can't come back with them: they return with no role (no access).
    const roleCleared = !!user.adminRole?.deletedAt;
    await prisma.user.update({ where: { id: parsed.data.id }, data: { deletedAt: null, deletedById: null, ...(roleCleared && { adminRoleId: null }) } });
    await logAudit({
      action: "user.restore",
      entityType: "user",
      entityId: parsed.data.id,
      entityLabel: `${user.name} (${user.email})`,
      changes: roleCleared ? { Role: [user.adminRole?.name ?? "—", "No role (role was deleted)"] } : undefined,
    });
    refresh();
    return { success: true, name: user.name, roleCleared };
  } catch (error) {
    console.error("[admin-users] restore failed", error instanceof Error ? error.name : error);
    return { success: false, error: "We couldn't restore the user. Please try again." };
  }
}
