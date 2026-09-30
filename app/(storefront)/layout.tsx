import { StorefrontFooter } from "@/components/shell/StorefrontFooter";
import { StorefrontHeader } from "@/components/shell/StorefrontHeader";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <StorefrontHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <StorefrontFooter />
    </div>
  );
}
