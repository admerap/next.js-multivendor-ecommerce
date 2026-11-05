import { AccountCard } from "@/components/account/AccountCard";
import { WishlistSkeleton } from "@/components/account/WishlistView";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <AccountCard>
      <Skeleton className="mb-5 h-8 w-44 rounded-sm" />
      <WishlistSkeleton />
    </AccountCard>
  );
}
