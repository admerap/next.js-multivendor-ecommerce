"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** The URL that wasn't found, shown back to the shopper (helps spot a typo). */
export function RequestedPath() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;
  return (
    <code className="inline-block max-w-full truncate rounded-md border border-line bg-card px-3 py-1.5 font-mono text-caption text-fg-muted shadow-xs" title={pathname}>
      {pathname}
    </code>
  );
}

type NavigationLike = { currentEntry?: { index: number } | null; entries?: () => { url: string | null }[] };

/**
 * Is the previous entry of this tab a page of this site? The Navigation API (Chromium) lists this tab's
 * same-origin entries, client-side navigations included; elsewhere fall back to document.referrer.
 */
function previousIsSundry(): boolean {
  const sameOrigin = (url: string | null | undefined) => {
    try {
      return !!url && new URL(url).origin === window.location.origin;
    } catch {
      return false;
    }
  };
  const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
  if (nav?.currentEntry && typeof nav.entries === "function") {
    const i = nav.currentEntry.index;
    return i > 0 && sameOrigin(nav.entries()[i - 1]?.url);
  }
  return window.history.length > 1 && sameOrigin(document.referrer);
}

/**
 * "Go back" — the previous page when the shopper came from another Sundry page; otherwise (typed URL,
 * new tab, a link from another site) the home page, so the button never leaves the store.
 */
export function GoBackButton() {
  const router = useRouter();
  function goBack() {
    if (previousIsSundry()) router.back();
    else router.push("/");
  }
  return (
    <Button type="button" variant="secondary" size="lg" onClick={goBack} className="max-sm:w-full">
      <ArrowLeft aria-hidden />
      Go back
    </Button>
  );
}
