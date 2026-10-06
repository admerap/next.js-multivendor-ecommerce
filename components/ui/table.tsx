import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM §5 DataTable primitives: sunken header row, 12px/700 uppercase labels, 14px rows. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table data-slot="table" className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-sunken", className)} {...props} />;
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-line transition-colors duration-(--dur-fast) last:border-b-0 hover:bg-hover", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-[0.7rem] font-bold tracking-[0.06em] whitespace-nowrap text-fg-muted uppercase first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3.5 align-middle text-fg first:pl-5 last:pr-5", className)} {...props} />;
}
