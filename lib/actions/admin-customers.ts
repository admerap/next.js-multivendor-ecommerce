"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/access.server";
import { forbiddenResult } from "@/lib/admin-auth";
import { setCustomerBlocked } from "@/lib/admin-customers.server";
import { customerBlockSchema } from "@/lib/validations/admin-customer";

export type CustomerBlockResult = { success: true } | { success: false; error: string };

/**
 * Admin › Customer List / details › Block or unblock a customer. Admin-only. A blocked customer can't
 * sign in, and an open session ends on its next request (auth.ts); orders and reviews are kept.
 */
export async function setCustomerBlockedAction(input: unknown): Promise<CustomerBlockResult> {
  if (!(await can("customers", "update"))) return forbiddenResult("customers");
  const parsed = customerBlockSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That customer couldn't be found." };
  if (!(await setCustomerBlocked(parsed.data.id, parsed.data.blocked))) return { success: false, error: "That customer couldn't be found." };
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${parsed.data.id}`);
  return { success: true };
}
