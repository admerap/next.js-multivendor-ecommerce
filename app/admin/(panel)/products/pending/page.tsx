import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Pending Products" };

/** Product Manage › Pending Product: vendor products waiting for review, oldest first. */
export default async function PendingProductsPage({ searchParams }: PageProps<"/admin/products/pending">) {
  await requirePermission("products");
  return <AdminProductList view="pending" searchParams={await searchParams} />;
}
