import { ProfileSkeleton } from "@/components/account/ProfileSkeleton";
import { Skeleton } from "@/components/states/Skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-2 h-7 w-40 rounded-sm" />
      <ProfileSkeleton />
    </>
  );
}
