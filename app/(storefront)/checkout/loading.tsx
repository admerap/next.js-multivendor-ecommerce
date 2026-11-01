import { CartSkeleton } from "@/components/checkout/CartView";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { Skeleton } from "@/components/states/Skeleton";
import { cn } from "@/lib/utils";

export default function Loading() {
  return (
    <main className={cn(pageContainer, "pt-7 pb-4")}>
      <Skeleton className="mx-auto mb-7 h-15 w-full max-w-140 rounded-md" />
      <CartSkeleton />
    </main>
  );
}
