import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Denied Products" };

/** Product Manage › Denied Product: Denied products and the reason the store sees, newest first. */
export default async function DeniedProductsPage({ searchParams }: PageProps<"/admin/products/denied">) {
  await requireArea("ADMIN");
  return <AdminProductList view="denied" searchParams={await searchParams} />;
}
