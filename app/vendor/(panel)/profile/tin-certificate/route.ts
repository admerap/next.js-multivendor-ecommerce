import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, tinCertificateResponse } from "@/lib/tin-certificate-response";

/**
 * GET /vendor/profile/tin-certificate — the signed-in vendor's OWN certificate only.
 * The vendor id comes from the session; there is no id in the URL to tamper with.
 */
export async function GET() {
  const session = await auth();
  const me = session?.user;
  if (!me || me.role !== "VENDOR" || me.vendorStatus !== "APPROVED" || !me.vendorId) return notFound();

  const vendor = await prisma.vendor.findFirst({ where: { id: me.vendorId, userId: me.id }, select: { tinCertificate: true, slug: true } });
  if (!vendor) return notFound();
  return tinCertificateResponse(vendor.tinCertificate, vendor.slug);
}
