import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { CartProvider } from "@/components/commerce/CartProvider";
import { AppThemeProvider } from "@/components/shell/AppThemeProvider";
import { AppToaster } from "@/components/ui/AppToaster";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Sundry", template: "%s · Sundry" },
  description: "Thousands of independent sellers, one storefront, one checkout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets data-theme on <html> before paint, so the attribute differs from the server render.
    <html lang="en" suppressHydrationWarning className={`${bricolage.variable} ${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AppThemeProvider>
          <CartProvider>{children}</CartProvider>
          <AppToaster />
        </AppThemeProvider>
      </body>
    </html>
  );
}
