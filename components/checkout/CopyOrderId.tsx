"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

/** "Copy" in the order ID pill (Order Complete design). */
export function CopyOrderId({ orderNumber }: { orderNumber: number }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`#${orderNumber}`);
      setCopied(true);
      toast.success(`Order ID #${orderNumber} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the order ID and copy it manually.");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy order ID #${orderNumber}`}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4.5 text-sm font-semibold text-on-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover max-lg:h-11"
    >
      {copied ? <Check aria-hidden className="size-4" strokeWidth={2.4} /> : <Copy aria-hidden className="size-4" strokeWidth={2} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
