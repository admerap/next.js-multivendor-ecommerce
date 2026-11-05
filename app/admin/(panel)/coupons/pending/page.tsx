import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Pending Coupons" };

/** Coupon Manage › Pending Coupon. */
export default async function PendingCouponsPage({ searchParams }: PageProps<"/admin/coupons/pending">) {
  await requirePermission("coupons");
  return <AdminCouponList view="pending" searchParams={await searchParams} />;
}
