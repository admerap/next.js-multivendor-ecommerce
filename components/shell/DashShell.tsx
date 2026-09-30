"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  Ellipsis,
  KeyRound,
  LogOut,
  Maximize,
  Menu,
  Search,
  ShoppingBag,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { useBodyScrollLock, useMediaQuery } from "@/lib/hooks";
import { toneClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { THEMES, ThemeMenu } from "./ThemeMenu";

export type NavItem = { label: string; href: string; count?: number; tone?: Tone; dot?: boolean };
export type NavSection = { key: string; label: string; icon: LucideIcon; groups: { title: string; items: NavItem[] }[] };
const TONE = toneClasses;

type Overlay = null | "drawer" | "profile" | "theme" | "more" | "search";

const iconBtn =
  "grid size-10 place-items-center rounded-md text-fg transition-colors duration-(--dur-fast) hover:bg-hover hover:text-primary";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  return pathname === path;
}

export function DashShell({
  badge,
  sections,
  crumb,
  user,
  profileLinks,
  quickLinks,
  withSearch = false,
  withTheme = false,
  footer,
  children,
}: {
  /** Pill next to the wordmark: "Admin" / "Seller". */
  badge: string;
  sections: NavSection[];
  crumb: string;
  user: { name: string; email: string; subtitle: string };
  profileLinks: { settings: string; password: string };
  /** Header icon links (e.g. View storefront, New orders). */
  quickLinks: { label: string; href: string; icon: LucideIcon }[];
  withSearch?: boolean;
  withTheme?: boolean;
  footer: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const desktop = useMediaQuery("(min-width: 1201px)");
  const [sideOpen, setSideOpen] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const initialSection =
    sections.find((s) => s.groups.some((g) => g.items.some((i) => isActive(pathname, i.href))))?.key ?? sections[0]!.key;
  const [railKey, setRailKey] = useState(initialSection);
  const section = sections.find((s) => s.key === railKey) ?? sections[0]!;
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const kbd = useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );

  // Navigating closes any open overlay (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOverlay(null);
  }

  const drawerOpen = overlay === "drawer" && !desktop;
  const toggle = (o: Exclude<Overlay, null>) => setOverlay((cur) => (cur === o ? null : o));
  useBodyScrollLock(drawerOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null);
      if (withSearch && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.innerWidth <= 1100) setOverlay("search");
        else searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [withSearch]);

  useEffect(() => {
    if (overlay === "search") mobileSearchRef.current?.focus();
  }, [overlay]);

  const panelVisible = desktop ? sideOpen : drawerOpen;
  const toggleSidebar = () => (desktop ? setSideOpen((v) => !v) : toggle("drawer"));
  const sidebarExpanded = desktop ? sideOpen : drawerOpen;

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const rail = (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-line py-4">
      {sections.map(({ key, label, icon: Icon }) => {
        const on = key === section.key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              setRailKey(key);
              if (desktop && !sideOpen) setSideOpen(true);
              if (!desktop && overlay !== "drawer") setOverlay("drawer");
            }}
            aria-label={label}
            aria-pressed={on}
            title={label}
            className={cn(
              "grid size-11 place-items-center rounded-md transition-colors duration-(--dur-fast)",
              on ? "bg-primary text-on-primary shadow-primary" : "text-fg-muted hover:bg-hover hover:text-primary",
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );

  const panel = (
    <nav aria-label={section.label} className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3.5 py-5">
      <h2 className="mx-1.5 mb-4.5 font-display text-lg font-extrabold tracking-[-0.01em] text-fg-strong">
        {section.label}
      </h2>
      {section.groups.map((g) => (
        <div key={g.title} className="mb-3.5">
          <div className="mx-2.5 mb-2 text-[0.65rem] font-bold tracking-[0.08em] text-fg-subtle uppercase">{g.title}</div>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => {
              const on = isActive(pathname, it.href);
              const tone = it.tone ? TONE[it.tone] : null;
              return (
                <li key={it.href + it.label}>
                  <Link
                    href={it.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-md px-3 text-sm font-semibold transition-colors duration-(--dur-fast)",
                      on ? "bg-iris-50 !text-primary" : "!text-fg hover:bg-hover",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {it.dot && tone && <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", tone.dot)} />}
                      <span className="truncate">{it.label}</span>
                    </span>
                    {it.count !== undefined && tone && (
                      <span
                        className={cn(
                          "inline-grid h-5.5 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-[0.68rem] font-bold tabular-nums",
                          tone.bg,
                          tone.fg,
                        )}
                      >
                        {it.count.toLocaleString("en-US")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-17 items-center bg-card shadow-xs">
        <div
          className={cn(
            "flex h-full shrink-0 items-center gap-2.5 overflow-hidden pl-4 transition-[width,padding] duration-(--dur-med) ease-out sm:border-r sm:border-line sm:px-3.5",
            desktop && sideOpen ? "sm:w-70 sm:px-5" : "sm:w-16",
          )}
        >
          <Link href="/" aria-label="Sundry storefront" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary shadow-primary">
            <ShoppingBag aria-hidden className="size-5 text-on-primary" strokeWidth={2} />
          </Link>
          {desktop && sideOpen && (
            <>
              <span className="font-display text-[1.3rem] font-extrabold tracking-[-0.02em] text-fg-strong">Sundry</span>
              <span className="rounded-full bg-iris-50 px-2 py-0.5 text-[0.65rem] font-bold text-primary">{badge}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarExpanded ? "Hide sidebar" : "Open menu"}
          aria-expanded={sidebarExpanded}
          title={sidebarExpanded ? "Hide sidebar" : "Open menu"}
          className="ml-2.5 grid size-10 shrink-0 place-items-center rounded-md border border-line bg-card text-fg transition-colors duration-(--dur-fast) hover:border-iris-200 hover:bg-iris-50 hover:text-primary sm:ml-4"
        >
          {sidebarExpanded ? (
            <ChevronsLeft aria-hidden className="size-[18px]" strokeWidth={2} />
          ) : (
            <Menu aria-hidden className="size-[18px]" strokeWidth={2} />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 sm:gap-4 sm:pr-7 sm:pl-4">
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-caption text-fg-muted md:flex">
            <Link href="/" className="font-semibold">
              Home
            </Link>
            <ChevronRight aria-hidden className="size-3.5" />
            <span aria-current="page" className="font-semibold text-fg-strong">
              {crumb}
            </span>
          </nav>

          {withSearch && (
            <label className="ml-auto hidden h-10.5 min-w-0 flex-[0_1_380px] cursor-text items-center gap-2 rounded-md border border-line bg-sunken pr-2 pl-3 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-100)] min-[1101px]:flex">
              <Search aria-hidden className="size-[18px] shrink-0 text-fg-muted" strokeWidth={1.9} />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search orders, products, stores…"
                aria-label="Search the admin panel"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
              />
              <kbd className="hidden rounded-sm border border-line-default bg-card px-1.5 py-0.5 font-sans text-[0.65rem] font-bold whitespace-nowrap text-fg-muted min-[1281px]:inline">
                {kbd}
              </kbd>
            </label>
          )}

          <div className={cn("ml-auto flex items-center gap-1.5", withSearch && "min-[1101px]:ml-0")}>
            {withSearch && (
              <button type="button" onClick={() => toggle("search")} aria-label="Search" className={cn(iconBtn, "min-[1101px]:hidden", !withSearch && "hidden")}>
                <Search aria-hidden className="size-5" strokeWidth={1.9} />
              </button>
            )}

            {/* Icon set: inline ≥721px, folded into "⋯" below */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {quickLinks.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} aria-label={label} title={label} className={iconBtn}>
                  <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                </Link>
              ))}
              {withTheme && <ThemeMenu open={overlay === "theme"} onOpenChange={(o) => setOverlay(o ? "theme" : null)} />}
              <button type="button" onClick={fullscreen} aria-label="Fullscreen" title="Fullscreen" className={cn(iconBtn, "max-md:hidden")}>
                <Maximize aria-hidden className="size-5" strokeWidth={1.9} />
              </button>
            </div>
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => toggle("more")}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={overlay === "more"}
                className={cn(iconBtn, overlay === "more" && "bg-sunken")}
              >
                <Ellipsis aria-hidden className="size-5" strokeWidth={1.9} />
              </button>
              {overlay === "more" && (
                <div role="menu" className="absolute top-[calc(100%+8px)] right-0 z-50 flex w-[min(260px,calc(100vw-24px))] flex-col gap-0.5 rounded-lg border border-line bg-card p-1.5 shadow-xl">
                  {quickLinks.map(({ label, href, icon: Icon }) => (
                    <Link key={label} href={href} role="menuitem" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold !text-fg hover:bg-sunken">
                      <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                      {label}
                    </Link>
                  ))}
                  {withTheme && <MobileThemeItems />}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative ml-1 sm:ml-2">
              <button
                type="button"
                onClick={() => toggle("profile")}
                aria-haspopup="menu"
                aria-expanded={overlay === "profile"}
                aria-label="Account menu"
                className={cn(
                  "flex h-12 items-center gap-2.5 rounded-full border pr-1.5 pl-1.5 transition-colors duration-(--dur-fast) min-[1101px]:pr-3",
                  overlay === "profile" ? "border-iris-200 bg-iris-50 shadow-[0_0_0_3px_var(--iris-50)]" : "border-line bg-card",
                )}
              >
                <span className="relative grid size-9 place-items-center rounded-full bg-iris-50 text-caption font-bold text-primary">
                  {initials(user.name)}
                  <span aria-hidden className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card bg-success-500" />
                </span>
                <span className="hidden flex-col items-start leading-tight whitespace-nowrap min-[1101px]:flex">
                  <span className="text-caption font-bold text-fg-strong">{user.name}</span>
                  <span className="text-[0.65rem] text-fg-muted">{user.subtitle}</span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "hidden size-4 text-fg-muted transition-transform duration-(--dur-fast) min-[1101px]:block",
                    overlay === "profile" && "rotate-180",
                  )}
                />
              </button>
              {overlay === "profile" && (
                <div role="menu" className="absolute top-[calc(100%+10px)] right-0 z-50 w-65 overflow-hidden rounded-lg border border-line bg-card shadow-xl">
                  <div className="flex items-center gap-3 border-b border-line bg-sunken p-4">
                    <span className="grid size-10.5 shrink-0 place-items-center rounded-full bg-iris-50 text-sm font-bold text-primary">
                      {initials(user.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-fg-strong">{user.name}</span>
                      <span className="block truncate text-caption text-fg-muted">{user.email}</span>
                    </span>
                  </div>
                  <div className="p-1.5">
                    {[
                      { label: "Profile Settings", href: profileLinks.settings, icon: UserCog },
                      { label: "Change Password", href: profileLinks.password, icon: KeyRound },
                    ].map(({ label, href, icon: Icon }) => (
                      <Link key={label} href={href} role="menuitem" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold !text-fg hover:bg-iris-50 hover:!text-primary">
                        <Icon aria-hidden className="size-[18px]" strokeWidth={1.9} />
                        {label}
                      </Link>
                    ))}
                  </div>
                  <form action={signOutAction} className="border-t border-line p-1.5">
                    <button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-error-600 hover:bg-error-50">
                      <LogOut aria-hidden className="size-[18px]" strokeWidth={1.9} />
                      Log Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search (≤1100px) */}
      {withSearch && overlay === "search" && (
        <div className="sticky top-17 z-39 flex items-center gap-2.5 border-b border-line bg-card px-4 py-2.5 shadow-sm min-[1101px]:hidden">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-primary bg-sunken px-3 shadow-[0_0_0_3px_var(--iris-100)]">
            <Search aria-hidden className="size-[18px] shrink-0 text-fg-muted" strokeWidth={1.9} />
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="Search orders, products, stores…"
              aria-label="Search the admin panel"
              className="h-full min-w-0 flex-1 bg-transparent text-[0.9rem] text-fg-strong outline-none placeholder:text-fg-subtle"
            />
          </div>
          <button type="button" onClick={() => setOverlay(null)} className="h-11 px-1.5 text-sm font-semibold text-primary">
            Cancel
          </button>
        </div>
      )}

      {/* Click-away layer for header menus */}
      {(overlay === "profile" || overlay === "theme" || overlay === "more") && (
        <div aria-hidden className="fixed inset-0 z-30" onClick={() => setOverlay(null)} />
      )}

      <div className="flex flex-1 items-stretch">
        {/* Docked sidebar: full ≥1201, rail-only 721–1200, hidden ≤720 */}
        <aside
          className={cn(
            "sticky top-17 hidden h-[calc(100dvh-68px)] shrink-0 overflow-hidden border-r border-line bg-card transition-[width] duration-(--dur-med) ease-out sm:flex",
            desktop && sideOpen ? "w-70" : "w-16",
          )}
        >
          {rail}
          {desktop && panelVisible && panel}
        </aside>

        {/* Floating drawer ≤1200 */}
        {drawerOpen && (
          <>
            <div aria-hidden className="fixed inset-0 top-17 z-44 bg-inverse/40" onClick={() => setOverlay(null)} />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="fixed top-17 bottom-0 left-0 z-45 flex w-[min(320px,86vw)] bg-card shadow-xl sm:w-75"
            >
              {rail}
              {panel}
            </aside>
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-5 pb-10 sm:gap-6 sm:px-[clamp(16px,3vw,36px)] sm:pt-7 sm:pb-12">
          {children}
          <footer className="mt-2 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-caption text-fg-subtle">
            <span>{footer}</span>
            <span className="flex gap-4">
              <Link href="#" className="!text-fg-muted hover:!text-primary">
                Platform policies
              </Link>
              <Link href="#" className="!text-fg-muted hover:!text-primary">
                Help center
              </Link>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function MobileThemeItems() {
  return (
    <div className="mt-1 border-t border-line pt-1">
      <MobileThemeRow />
    </div>
  );
}

function MobileThemeRow() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="group" aria-label="Theme" className="flex gap-1 p-1">
      {THEMES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="menuitemradio"
          aria-checked={theme === key}
          onClick={() => setTheme(key)}
          className={cn(
            "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[0.68rem] font-semibold",
            theme === key ? "bg-iris-50 text-primary" : "text-fg hover:bg-sunken",
          )}
        >
          <Icon aria-hidden className="size-4" strokeWidth={1.9} />
          {label}
        </button>
      ))}
    </div>
  );
}

