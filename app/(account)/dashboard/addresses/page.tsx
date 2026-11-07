import type { Metadata } from "next";
import { AccountCard } from "@/components/account/AccountCard";
import { AddressBook } from "@/components/account/AddressBook";
import { listAddresses } from "@/lib/addresses.server";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "My Address" };

/** My Address (useraddress design): the signed-in customer's own saved delivery addresses — nobody else's. */
export default async function AddressesPage() {
  const user = await requireArea("CUSTOMER");
  const [addresses, me] = await Promise.all([listAddresses(user.id), prisma.user.findUnique({ where: { id: user.id }, select: { name: true, phone: true } })]);
  return (
    <AccountCard>
      {/* New addresses start with the account's name and phone. */}
      <AddressBook addresses={addresses} contact={{ name: me?.name ?? "", phone: me?.phone ?? "" }} />
    </AccountCard>
  );
}
