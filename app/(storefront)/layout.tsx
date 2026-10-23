import { QuickViewProvider } from "@/components/commerce/QuickView";
import { StorefrontFooter } from "@/components/shell/StorefrontFooter";
import { StorefrontHeader } from "@/components/shell/StorefrontHeader";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <StorefrontHeader />
      {/* One quick-view modal for every product card on the storefront. */}
      <QuickViewProvider>
        <div className="flex flex-1 flex-col">{children}</div>
      </QuickViewProvider>
      <StorefrontFooter />
    </div>
  );
}
