import type { Metadata } from "next";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Featured Products" };

/** Product Manage › Featured Product: Products checked as Featured (any review status; the storefront shows only approved, active ones). */
export default async function FeaturedProductsPage({ searchParams }: PageProps<"/admin/products/featured">) {
  await requireArea("ADMIN");
  return <AdminProductList view="featured" searchParams={await searchParams} />;
}
