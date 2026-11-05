"use client";

import { Info } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Shown on the seller card after a vendor or admin used "Chat with Vendor" (/chat/start sends them back with
 * ?chat=customers-only): chat with stores is a shopper feature.
 */
export function ChatNotice() {
  const chat = useSearchParams().get("chat");
  if (chat !== "customers-only") return null;
  return (
    <p role="status" className="mt-2.5 flex items-start gap-2 rounded-md bg-info-50 px-3 py-2.5 text-caption text-info-600">
      <Info aria-hidden className="mt-px size-3.5 shrink-0" />
      Chat with stores is for shopper accounts. Sign in with a customer account to message this seller.
    </p>
  );
}
