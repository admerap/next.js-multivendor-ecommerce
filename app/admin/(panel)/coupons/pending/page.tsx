import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Pending Coupons" };

/** Coupon Manage › Pending Coupon. */
export default async function PendingCouponsPage({ searchParams }: PageProps<"/admin/coupons/pending">) {
  await requireArea("ADMIN");
  return <AdminCouponList view="pending" searchParams={await searchParams} />;
}
