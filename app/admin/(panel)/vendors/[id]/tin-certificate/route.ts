import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, tinCertificateResponse } from "@/lib/tin-certificate-response";

/** GET /admin/vendors/[id]/tin-certificate — admins only (re-checked here, not just in the proxy). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return notFound();

  const { id } = await params;
  if (!id || id.length > 40) return notFound();
  const vendor = await prisma.vendor.findFirst({ where: { id, user: { role: "VENDOR" } }, select: { tinCertificate: true, slug: true } });
  if (!vendor) return notFound();
  return tinCertificateResponse(vendor.tinCertificate, vendor.slug);
}
