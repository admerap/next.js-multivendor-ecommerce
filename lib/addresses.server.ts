import "server-only";

import { prisma } from "@/lib/db";
import type { SavedAddressInput } from "@/lib/validations/checkout";

export type SavedAddress = Required<Omit<SavedAddressInput, "type">> & { id: string; type: "HOME" | "OFFICE" | "OTHER"; isDefault: boolean };

/** My Address: the customer's own saved addresses, the default first, then newest. Callers pass the session's id. */
export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      name: true,
      phone: true,
      country: true,
      state: true,
      city: true,
      zip: true,
      address: true,
      address2: true,
      isDefault: true,
    },
  });
  return rows.map((r) => ({ ...r, country: r.country as SavedAddress["country"], state: r.state ?? "", address2: r.address2 ?? "" }));
}
