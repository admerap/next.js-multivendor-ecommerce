import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Denied Coupons" };

/** Coupon Manage › Denied Coupon. */
export default async function DeniedCouponsPage({ searchParams }: PageProps<"/admin/coupons/denied">) {
  await requirePermission("coupons");
  return <AdminCouponList view="denied" searchParams={await searchParams} />;
}
