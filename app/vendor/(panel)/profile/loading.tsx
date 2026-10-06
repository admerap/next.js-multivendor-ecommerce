import { Skeleton } from "@/components/states/Skeleton";
import { ProfileSkeleton } from "@/components/vendor/profile/ProfileSkeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-10 w-64 rounded-md" />
      <Skeleton className="h-11 w-72 max-w-full rounded-full" />
      <ProfileSkeleton />
    </>
  );
}
