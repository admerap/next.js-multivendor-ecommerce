import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Approved Products" };

/** Product Manage › Approved Product: Approved products, newest first. Check Featured or Popular to place them on the storefront. */
export default async function ApprovedProductsPage({ searchParams }: PageProps<"/admin/products/approved">) {
  await requirePermission("products");
  return <AdminProductList view="approved" searchParams={await searchParams} />;
}
