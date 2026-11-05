import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Denied Products" };

/** Product Manage › Denied Product: Denied products and the reason the store sees, newest first. */
export default async function DeniedProductsPage({ searchParams }: PageProps<"/admin/products/denied">) {
  await requirePermission("products");
  return <AdminProductList view="denied" searchParams={await searchParams} />;
}
