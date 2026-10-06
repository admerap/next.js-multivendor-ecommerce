import { CalendarDays, CircleCheck, ExternalLink, FileCheck2, FileText, Hash, Mail, MapPin, Package, Phone, Store, UserRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StoreAvatar } from "@/components/admin/vendors/StoreAvatar";
import { VendorStatusActions } from "@/components/admin/vendors/VendorStatusActions";
import { VendorStatusBadge } from "@/components/admin/vendors/VendorStatusBadge";
import { DashCard, IconTile } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { requireArea } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import { getVendor } from "../actions";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
const notProvided = <span className="text-fg-muted">Not provided</span>;

export async function generateMetadata({ params }: PageProps<"/admin/vendors/[id]">): Promise<Metadata> {
  const { id } = await params;
  const res = await getVendor(id);
  return { title: res.data?.storeName ?? "Vendor" };
}

function InfoList({ rows }: { rows: { icon: LucideIcon; label: string; value: ReactNode }[] }) {
  return (
    <dl className="mt-4 flex flex-col divide-y divide-line">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" strokeWidth={1.9} />
          {/* Phones: label above the value so long values (emails, addresses) get the full width. */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-caption font-semibold text-fg-muted sm:w-28">{label}</dt>
            <dd className="min-w-0 flex-1 text-sm break-words text-fg-strong">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * Vendor details (shared by Vendor Approval and Vendor List). Approve / Suspend live in the header.
 * Extension point: the full vendor analytics (orders, revenue, ratings…) go below the stats row.
 */
export default async function VendorDetailPage({ params }: PageProps<"/admin/vendors/[id]">) {
  await requireArea("ADMIN");
  const { id } = await params;
  const res = await getVendor(id);
  if (!res.success) throw new Error(res.error ?? "Couldn't load this vendor"); // → error.tsx (Retry)
  const v = res.data;
  if (!v) notFound();

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          v.status === "PENDING" ? { label: "Vendor Approval", href: "/admin/vendors/approval" } : { label: "Vendor List", href: "/admin/vendors" },
          { label: v.storeName },
        ]}
      />

      {/* Header card (with the shop cover as a banner when there is one) */}
      <section className="overflow-hidden rounded-lg bg-card shadow-sm">
        {v.coverImage && (
          <div className="relative aspect-[4/1] max-h-44 w-full bg-sunken">
            <Image src={v.coverImage} alt={`${v.storeName} cover`} fill sizes="(max-width: 1200px) 100vw, 1100px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
          <StoreAvatar name={v.storeName} src={v.logo} size="lg" />
          <div className="min-w-0 flex-[1_1_240px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] break-words text-fg-strong">{v.storeName}</h1>
              <VendorStatusBadge status={v.status} />
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-fg-muted">
              <div className="flex items-center gap-1.5">
                <dt>
                  <UserRound aria-label="Owner" className="size-3.5" strokeWidth={2} />
                </dt>
                <dd>{v.ownerName}</dd>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <dt>
                  <Mail aria-label="Email" className="size-3.5" strokeWidth={2} />
                </dt>
                <dd className="truncate">{v.email}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>
                  <CalendarDays aria-label="Registered" className="size-3.5" strokeWidth={2} />
                </dt>
                <dd>Registered {dateFmt.format(new Date(v.createdAt))}</dd>
              </div>
            </dl>
          </div>
          <VendorStatusActions id={v.id} storeName={v.storeName} status={v.status} />
        </div>
      </section>

      {/* Stats — TODO(catalog): products come from Product counts once that model exists (0 until then). */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Total products", value: v.productsCount, icon: Package, tone: "iris" as const, place: "" },
          // Far right: last column on wide screens (the right half on tablets, full width on phones).
          { label: "Active products", value: v.activeProductsCount, icon: CircleCheck, tone: "success" as const, place: "xl:col-start-3" },
        ].map((s) => (
          <div key={s.label} className={cn("flex items-center justify-between gap-3 rounded-lg bg-card p-5 shadow-sm", s.place)}>
            <div>
              <div className="text-caption font-semibold text-fg-muted">{s.label}</div>
              <div className="mt-1 font-display text-[1.6rem] font-extrabold text-fg-strong tabular-nums">{s.value}</div>
            </div>
            <IconTile icon={s.icon} tone={s.tone} size="lg" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DashCard title="Store information" icon={Store}>
          <InfoList
            rows={[
              { icon: Store, label: "Store name", value: v.storeName },
              { icon: Store, label: "Store URL", value: `/vendors/${v.slug}` },
              { icon: Phone, label: "Phone", value: v.storePhone },
              { icon: MapPin, label: "Address", value: v.storeAddress },
            ]}
          />
        </DashCard>
        <DashCard title="Owner information" icon={UserRound}>
          {v.vendorImage && (
            <div className="relative mt-4 size-16 overflow-hidden rounded-full border border-line bg-sunken">
              <Image src={v.vendorImage} alt={v.ownerName} fill sizes="64px" className="object-cover" />
            </div>
          )}
          <InfoList
            rows={[
              { icon: UserRound, label: "Name", value: v.ownerName },
              { icon: Mail, label: "Email", value: v.email },
              { icon: Phone, label: "Phone", value: v.ownerPhone ?? notProvided },
              { icon: CalendarDays, label: "Registered", value: dateFmt.format(new Date(v.createdAt)) },
            ]}
          />
        </DashCard>
        <DashCard title="Business TIN" icon={FileText}>
          <InfoList
            rows={[
              { icon: Hash, label: "TIN", value: v.tinNumber ?? notProvided },
              { icon: CalendarDays, label: "Expiry date", value: v.tinExpiresAt ? dateFmt.format(new Date(`${v.tinExpiresAt}T00:00:00`)) : notProvided },
              {
                icon: FileCheck2,
                label: "Certificate",
                value: v.hasTinCertificate ? (
                  // Private file, streamed only to admins by the authorized route handler.
                  <a href={`/admin/vendors/${v.id}/tin-certificate`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold">
                    <ExternalLink aria-hidden className="size-3.5" strokeWidth={2} />
                    View certificate
                  </a>
                ) : (
                  notProvided
                ),
              },
            ]}
          />
        </DashCard>
      </div>
    </>
  );
}
