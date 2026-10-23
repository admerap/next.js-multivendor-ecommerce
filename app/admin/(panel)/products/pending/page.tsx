import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Pending Products" };

/** Product Manage › Pending Product: vendor products waiting for review, oldest first. */
export default async function PendingProductsPage({ searchParams }: PageProps<"/admin/products/pending">) {
  await requireArea("ADMIN");
  return <AdminProductList view="pending" searchParams={await searchParams} />;
}
