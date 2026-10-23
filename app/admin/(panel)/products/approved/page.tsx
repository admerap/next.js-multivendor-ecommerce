import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Approved Products" };

/** Product Manage › Approved Product: Approved products, newest first. Check Featured or Popular to place them on the storefront. */
export default async function ApprovedProductsPage({ searchParams }: PageProps<"/admin/products/approved">) {
  await requireArea("ADMIN");
  return <AdminProductList view="approved" searchParams={await searchParams} />;
}
