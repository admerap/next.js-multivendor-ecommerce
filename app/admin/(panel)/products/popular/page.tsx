import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Popular Products" };

/** Product Manage › Popular Product: Products checked as Most Popular (any review status; the storefront shows only approved, active ones). */
export default async function PopularProductsPage({ searchParams }: PageProps<"/admin/products/popular">) {
  await requirePermission("products");
  return <AdminProductList view="popular" searchParams={await searchParams} />;
}
