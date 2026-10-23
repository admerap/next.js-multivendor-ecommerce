"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteVendorDocument, deleteVendorImage, saveVendorDocument, saveVendorImage, UploadError } from "@/lib/uploads";
import {
  PROFILE_IMAGE_MAX_BYTES,
  TIN_CERT_MAX_BYTES,
  vendorProfileUpdateSchema,
} from "@/lib/validations/vendor-profile";
import { fieldErrorsOf } from "@/lib/form-errors";

// ── Full profile save: Basic Information (User) + Store Information (Vendor) in ONE transaction ──

export type VendorProfileSnapshot = {
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  storeName: string;
  storeAddress: string;
  logo: string | null;
  coverImage: string | null;
  tinNumber: string | null;
  tinExpiresAt: string | null;
  hasTinCertificate: boolean;
};

export type SaveProfileResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: VendorProfileSnapshot;
};

const EMAIL_TAKEN = "An account with this email already exists";
const TEXT_KEYS = ["name", "email", "currentPassword", "countryCode", "phone", "storeName", "storeAddress", "tinNumber", "tinExpiresAt", "removeLogo", "removeCover"] as const;
const FILE_KEYS = ["photo", "logo", "coverImage", "tinCertificate"] as const;
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Saves the signed-in vendor's profile. Rules:
 * - user id + vendor id come ONLY from the session (no ids are read from the form);
 * - everything is Zod-validated on the server; User and Vendor update in ONE transaction;
 * - changing the email requires the current password and a free address;
 * - files are validated and saved first; if anything fails they are deleted (no orphans);
 *   replaced/removed files are deleted only after the transaction commits;
 * - an unchanged TIN expiry date is kept even if it is already in the past.
 */
export async function saveVendorProfile(formData: FormData): Promise<SaveProfileResult> {
  const session = await auth();
  const me = session?.user;
  if (!me || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED" || !me.vendorId) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  const current = await prisma.vendor.findFirst({
    where: { id: me.vendorId, userId: me.id },
    select: {
      id: true,
      vendorImage: true,
      logo: true,
      coverImage: true,
      tinCertificate: true,
      tinExpiresAt: true,
      user: { select: { email: true, passwordHash: true } },
    },
  });
  if (!current) return { success: false, error: "We couldn't find your store. Please sign in again." };

  const raw: Record<string, unknown> = {};
  for (const k of TEXT_KEYS) raw[k] = formData.get(k) ?? "";
  for (const k of FILE_KEYS) raw[k] = formData.get(k) ?? undefined;

  // Unchanged expiry date → keep it as is (don't re-validate an old date the vendor didn't touch).
  const storedExpiry = isoDate(current.tinExpiresAt);
  const expiryUnchanged = raw.tinExpiresAt !== "" && raw.tinExpiresAt === storedExpiry;
  if (expiryUnchanged) raw.tinExpiresAt = "";

  const parsed = vendorProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Please fix the highlighted fields", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const d = parsed.data;

  // Email change: current password + uniqueness.
  const emailChanged = d.email !== current.user.email.toLowerCase();
  if (emailChanged) {
    if (!d.currentPassword) {
      const message = "Enter your current password to change your email";
      return { success: false, error: message, fieldErrors: { currentPassword: message } };
    }
    if (!(await bcrypt.compare(d.currentPassword, current.user.passwordHash))) {
      const message = "Your current password is incorrect";
      return { success: false, error: message, fieldErrors: { currentPassword: message } };
    }
    if (await prisma.user.count({ where: { email: d.email, NOT: { id: me.id } } })) {
      return { success: false, error: EMAIL_TAKEN, fieldErrors: { email: EMAIL_TAKEN } };
    }
  }

  // Files first (server-side size + magic bytes). Track everything new so a failure leaves nothing behind.
  const saved: { images: string[]; doc: string | null } = { images: [], doc: null };
  const discardNew = async () => {
    await Promise.all(saved.images.map((f) => deleteVendorImage(f)));
    await deleteVendorDocument(saved.doc);
  };
  const next: { photo?: string; logo?: string; coverImage?: string } = {};
  for (const key of ["photo", "logo", "coverImage"] as const) {
    const file = d[key];
    if (!file) continue;
    try {
      next[key] = await saveVendorImage(file, PROFILE_IMAGE_MAX_BYTES);
      saved.images.push(next[key]);
    } catch (error) {
      await discardNew();
      if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { [key]: error.message } };
      console.error("[vendor profile] image save failed", error instanceof Error ? error.message : error);
      return { success: false, error: "We couldn't save your images. Your changes are kept — try again." };
    }
  }
  if (d.tinCertificate) {
    try {
      saved.doc = await saveVendorDocument(d.tinCertificate, { maxBytes: TIN_CERT_MAX_BYTES, allow: ["pdf", "jpg", "png", "webp"] });
    } catch (error) {
      await discardNew();
      if (error instanceof UploadError) return { success: false, error: error.message, fieldErrors: { tinCertificate: error.message } };
      console.error("[vendor profile] certificate save failed", error instanceof Error ? error.message : error);
      return { success: false, error: "We couldn't save your certificate. Your changes are kept — try again." };
    }
  }

  const logo = next.logo ?? (d.removeLogo ? null : current.logo);
  const coverImage = next.coverImage ?? (d.removeCover ? null : current.coverImage);
  const tinExpiresAt = expiryUnchanged ? current.tinExpiresAt : d.tinExpiresAt ? new Date(`${d.tinExpiresAt}T00:00:00Z`) : null;

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: me.id },
        data: { name: d.name, email: d.email, phone: d.phone ? `${d.countryCode} ${d.phone}` : null },
      }),
      prisma.vendor.update({
        where: { id: current.id },
        data: {
          storeName: d.storeName,
          storeAddress: d.storeAddress,
          logo,
          coverImage,
          tinNumber: d.tinNumber ?? null,
          tinExpiresAt,
          ...(next.photo && { vendorImage: next.photo }),
          ...(saved.doc && { tinCertificate: saved.doc }),
        },
      }),
    ]);
  } catch (error) {
    await discardNew(); // nothing committed → drop the files we just wrote
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: EMAIL_TAKEN, fieldErrors: { email: EMAIL_TAKEN } };
    }
    console.error("[vendor profile] save failed", error instanceof Error ? error.message : error);
    return { success: false, error: "We couldn't save your profile. Your changes are kept — try again." };
  }

  // Committed → now it is safe to delete what was replaced or removed.
  if (next.photo) await deleteVendorImage(current.vendorImage);
  if (logo !== current.logo) await deleteVendorImage(current.logo);
  if (coverImage !== current.coverImage) await deleteVendorImage(current.coverImage);
  if (saved.doc) await deleteVendorDocument(current.tinCertificate);

  await unstable_update({ user: { name: d.name, email: d.email } }); // header + session stay in step
  revalidatePath("/vendor", "layout");
  revalidatePath(`/admin/vendors/${current.id}`);
  revalidatePath("/admin/vendors");

  return {
    success: true,
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone ? `${d.countryCode} ${d.phone}` : null,
      photo: next.photo ?? current.vendorImage,
      storeName: d.storeName,
      storeAddress: d.storeAddress,
      logo,
      coverImage,
      tinNumber: d.tinNumber ?? null,
      tinExpiresAt: isoDate(tinExpiresAt),
      hasTinCertificate: !!(saved.doc ?? current.tinCertificate),
    },
  };
}
