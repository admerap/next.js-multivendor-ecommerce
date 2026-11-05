import { KeyRound, UserRound } from "lucide-react";
import { PillTabs } from "@/components/data/PillTabs";

const TABS = [
  { label: "Basic Information", href: "/vendor/profile", icon: UserRound },
  { label: "Password", href: "/vendor/change-password", icon: KeyRound },
] as const;

/** Pill tabs under the page title (vendorProfile / vendorchangepassword designs). */
export function ProfileTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return <PillTabs tabs={TABS} active={active} label="Profile sections" />;
}
