import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Denied Coupons" };

/** Coupon Manage › Denied Coupon. */
export default async function DeniedCouponsPage({ searchParams }: PageProps<"/admin/coupons/denied">) {
  await requireArea("ADMIN");
  return <AdminCouponList view="denied" searchParams={await searchParams} />;
}
