"use client";

import { Mail, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import { ChatAvatar } from "@/components/chat/ChatAvatar";
import { cardLabelClass } from "@/components/data/list-classes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AdminUserRow } from "@/lib/admin-users.server";
import { cn } from "@/lib/utils";

const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Users › View: a read-only card with everything about one staff account. */
export function UserViewDialog({ user, open, onOpenChange }: { user: AdminUserRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const rows: { label: string; value: React.ReactNode; className?: string }[] = [
    { label: "ID", value: user.id, className: "break-all font-mono text-caption" },
    { label: "Name", value: user.firstName },
    { label: "Last Name", value: user.lastName || "—" },
    { label: "Email", value: user.email, className: "break-all" },
    { label: "Phone", value: user.phone ?? "—", className: "tabular-nums" },
    { label: "Role", value: user.role },
    { label: "Status", value: user.status === "active" ? "Active" : "Inactive (can't sign in)" },
    { label: "Created", value: when(user.createdAt) },
    { label: "Last updated", value: when(user.updatedAt) },
    ...(user.deletedAt ? [{ label: "Deleted", value: when(user.deletedAt), className: "text-error-600" }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="gap-0 p-0 sm:w-[min(560px,calc(100vw-32px))] sm:p-0">
        <div className="flex items-center gap-3 rounded-t-xl bg-primary px-5 py-4 text-on-primary sm:px-7 sm:py-5">
          <UserRound aria-hidden className="size-5.5" strokeWidth={2} />
          <DialogTitle className="flex-1 font-display text-xl font-extrabold text-on-primary">User Details</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full text-on-primary transition-colors duration-(--dur-fast) hover:bg-on-primary/15"
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
          </button>
        </div>
        <DialogDescription className="sr-only">{`Account details for ${name}.`}</DialogDescription>

        <div className="max-h-[calc(100dvh-200px)] overflow-y-auto px-5 py-6 sm:px-7">
          <div className="flex flex-col items-center gap-2 text-center">
            <ChatAvatar name={name} image={user.image} size={96} />
            <p className="mt-1 font-display text-lg font-bold text-fg-strong">{name}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone="primary">
                {user.isSuperAdmin && <ShieldCheck aria-hidden className="size-3.5" />}
                {user.role}
              </Badge>
              {user.deletedAt ? (
                <Badge tone="error">Deleted</Badge>
              ) : (
                <Badge tone={user.status === "active" ? "success" : "neutral"}>{user.status === "active" ? "Active" : "Inactive"}</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <a href={`mailto:${user.email}`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-primary">
                <Mail aria-hidden className="size-4" />
                {user.email}
              </a>
              {user.phone && (
                <a href={`tel:${user.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 tabular-nums hover:text-primary">
                  <Phone aria-hidden className="size-4" />
                  {user.phone}
                </a>
              )}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3.5 rounded-lg border border-line p-4 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>{r.label}</dt>
                <dd className={cn("text-sm font-medium text-fg-strong", r.className)}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-center border-t border-line px-5 py-5 sm:px-7">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            <X aria-hidden />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
