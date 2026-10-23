import { Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pagination } from "@/components/data/Pagination";
import { ListPageHeading } from "@/components/data/ListPageHeading";
import { ListToolbar } from "@/components/data/ListToolbar";
import { NoMatches } from "@/components/data/NoMatches";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { PreviewStateFrame } from "@/components/states/PreviewState";
import { Button } from "@/components/ui/button";
import { ProductsSkeleton } from "@/components/products/ProductsSkeleton";
import { ProductTable } from "@/components/vendor/products/ProductTable";
import { requireArea } from "@/lib/auth-guard";
import { APPROVAL_LABELS, APPROVAL_STATUSES, productListSchema } from "@/lib/validations/product";
import { getVendorProducts } from "./actions";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Product List" };

const STATUSES = APPROVAL_STATUSES.map((value) => ({ value, label: APPROVAL_LABELS[value] }));

/** "+ Add Product" — top-right of the page heading, like the Category Setup pages. */
const addProduct = (
  <Button asChild>
    <Link href="/vendor/products/add" className="!text-on-primary">
      <Plus aria-hidden />
      Add Product
    </Link>
  </Button>
);

const emptyState = (
  <EmptyState bare icon={Package} title="No products yet" description="Your store is live, but there is nothing to sell. Add your first product and it will appear here after approval.">
    {addProduct}
  </EmptyState>
);

function ListCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <ListToolbar searchLabel="Search by product name or SKU" statuses={STATUSES} />
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

/** Seller Center › Product Manage › Product List (vendorproductlist design). Only this vendor's products. */
export default async function VendorProductListPage({ searchParams }: PageProps<"/vendor/products">) {
  await requireArea("VENDOR");
  const sp = await searchParams;
  const params = productListSchema.parse(firstParams(sp));

  const res = await getVendorProducts(params);
  if (!res.success || !res.data) throw new Error(res.error ?? "Couldn't load products"); // → error.tsx (Retry)
  const { items, total, page, pageSize, pageCount } = res.data;
  const filtered = params.q !== "" || params.status !== "ALL";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/vendor/dashboard" }, { label: "Product Manage" }, { label: "Product List" }]} />
      <PreviewStateFrame
        className="flex flex-wrap items-center justify-between gap-4"
        heading={<ListPageHeading icon={Package} title="Product List" total={total} noun="products" />}
        actions={addProduct}
        loading={<ProductsSkeleton />}
        empty={<section className="rounded-lg bg-card shadow-sm">{emptyState}</section>}
        error={{ title: "Couldn't load this page", description: "Something went wrong reaching your store data. Check your connection and try again." }}
      >
        {total === 0 && !filtered ? (
          <section className="rounded-lg bg-card shadow-sm">{emptyState}</section>
        ) : (
          <ListCard>
            {items.length > 0 ? (
              <>
                <div className="pt-4 xl:pt-0">
                  <ProductTable items={items} offset={(page - 1) * pageSize} />
                </div>
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  pageSize={pageSize}
                  noun="products"
                  params={{
                    q: params.q || undefined,
                    status: params.status === "ALL" ? undefined : params.status,
                    pageSize: pageSize === 10 ? undefined : String(pageSize),
                  }}
                />
              </>
            ) : (
              <NoMatches noun="products" q={params.q} />
            )}
          </ListCard>
        )}
      </PreviewStateFrame>
    </>
  );
}
