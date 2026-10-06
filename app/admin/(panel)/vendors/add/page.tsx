import type { Metadata } from "next";
import { AddVendorForm } from "@/components/admin/vendors/AddVendorForm";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Add New Vendor" };

/** Admin › Vendor Manage › Add New Vendor (adminaddvendor design). */
export default async function AddVendorPage() {
  await requireArea("ADMIN");
  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Vendor Manage" }, { label: "Add New Vendor" }]} />
      <div>
        <h1 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">Add New Vendor</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Create a store on Sundry. Fields marked <span className="text-error-500">*</span> are required.
        </p>
      </div>
      <AddVendorForm />
    </>
  );
}
