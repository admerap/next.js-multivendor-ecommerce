import {
  Check,
  CircleCheck,
  Clock,
  Package,
  TriangleAlert,
  Truck,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { IconTile } from "@/components/data/DashCard";
import type { OrderStatusKey } from "@/lib/orders";
import { toneClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

/** Canonical status → tone map (DESIGN_SYSTEM §6). */
const STATUS_TILES: { key: OrderStatusKey; label: string; tone: Tone; icon: LucideIcon }[] = [
  { key: "PENDING", label: "Pending", tone: "info", icon: Clock },
  { key: "CONFIRMED", label: "Confirmed", tone: "iris", icon: CircleCheck },
  { key: "PACKAGING", label: "Packaging", tone: "warning", icon: Package },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", tone: "iris", icon: Truck },
  { key: "DELIVERED", label: "Delivered", tone: "success", icon: Check },
  { key: "CANCELED", label: "Canceled", tone: "error", icon: X },
  { key: "RETURNED", label: "Returned", tone: "neutral", icon: Undo2 },
  { key: "FAILED", label: "Failed to deliver", tone: "error", icon: TriangleAlert },
];

/** Eight order-status tiles linking to the filtered order list (`${ordersHref}?status=…`). */
export function OrderStatusGrid({ counts, ordersHref }: { counts: Record<OrderStatusKey, number>; ordersHref: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
      {STATUS_TILES.map((st) => (
        <Link
          key={st.key}
          href={`${ordersHref}?status=${st.key.toLowerCase()}`}
          className="flex min-h-11 flex-wrap items-center gap-2 rounded-md bg-sunken p-3 transition-[background-color,box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-0.5 hover:bg-card hover:shadow-md sm:flex-nowrap sm:gap-3 sm:px-4.5 sm:py-4"
        >
          <IconTile icon={st.icon} tone={st.tone} />
          <span className="order-3 basis-full text-caption font-semibold !text-fg sm:order-none sm:flex-1 sm:basis-auto sm:text-sm">
            {st.label}
          </span>
          <span className={cn("ml-auto font-display text-[1.3rem] font-extrabold tabular-nums", toneClasses[st.tone].fg)}>
            {counts[st.key]}
          </span>
        </Link>
      ))}
    </div>
  );
}
