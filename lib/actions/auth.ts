"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { LOGIN_PATH, safeCallbackUrl } from "@/lib/auth-routes";
import { prisma } from "@/lib/db";
import {
  customerRegisterSchema,
  loginSchema,
  vendorRegisterSchema,
} from "@/lib/validations/auth";

export type ActionResult = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
};

const DUPLICATE_EMAIL = "An account with this email already exists";
const duplicateEmail: ActionResult = {
  ok: false,
  message: DUPLICATE_EMAIL,
  fieldErrors: { email: DUPLICATE_EMAIL },
};

function invalid(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, message: "Please fix the highlighted fields", fieldErrors };
}

function uniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? String(error.meta?.target ?? "")
    : null;
}

/** Sends a freshly signed-in user to their area. Throws NEXT_REDIRECT, which must not be caught. */
async function redirectHome(email: string, callbackUrl?: unknown): Promise<never> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { role: true, vendor: { select: { status: true } } },
  });
  redirect(safeCallbackUrl(callbackUrl, { role: user.role, vendorStatus: user.vendor?.status }));
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, message: "Incorrect email or password" };
    console.error("[auth] login failed", error);
    return { ok: false, message: "We couldn't sign you in right now. Please try again." };
  }

  return redirectHome(parsed.data.email, callbackUrl);
}

export async function registerCustomerAction(input: unknown): Promise<ActionResult> {
  const parsed = customerRegisterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password } = parsed.data;

  try {
    if (await prisma.user.count({ where: { email } })) return duplicateEmail;
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, passwordHash, role: "CUSTOMER" } });
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (uniqueViolation(error) !== null) return duplicateEmail;
    console.error("[auth] customer registration failed", error);
    return { ok: false, message: "We couldn't create your account. Please try again." };
  }

  return redirectHome(email);
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "store";
}

async function uniqueVendorSlug(tx: Prisma.TransactionClient, storeName: string) {
  const base = slugify(storeName);
  const taken = await tx.vendor.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((v) => v.slug));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function registerVendorAction(input: unknown): Promise<ActionResult> {
  const parsed = vendorRegisterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { firstName, lastName, email, phone, password, storeName, storeAddress } = parsed.data;

  try {
    if (await prisma.user.count({ where: { email } })) return duplicateEmail;
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: `${firstName} ${lastName}`, email, passwordHash, role: "VENDOR" },
      });
      await tx.vendor.create({
        data: {
          userId: user.id,
          storeName,
          slug: await uniqueVendorSlug(tx, storeName),
          phone,
          storeAddress,
          status: "PENDING",
        },
      });
    });
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    const target = uniqueViolation(error);
    if (target?.includes("slug")) {
      return {
        ok: false,
        message: "That store name was just taken. Please try again.",
        fieldErrors: { storeName: "Try a slightly different store name" },
      };
    }
    if (target !== null) return duplicateEmail;
    console.error("[auth] vendor registration failed", error);
    return { ok: false, message: "We couldn't submit your application. Please try again." };
  }

  return redirectHome(email);
}

export async function signOutAction() {
  const session = await auth();
  await signOut({ redirectTo: LOGIN_PATH[session?.user.role ?? "CUSTOMER"] });
}
