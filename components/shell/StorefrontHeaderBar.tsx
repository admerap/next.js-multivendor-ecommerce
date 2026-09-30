"use client";

import {
  ChevronDown,
  ChevronRight,
  Headphones,
  Heart,
  Inbox,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_MENU, CategoryMegaMenu, MobileCategoryPanel } from "@/components/commerce/CategoryMegaMenu";
import { useCart } from "@/components/commerce/CartProvider";
import { MiniCart } from "@/components/commerce/MiniCart";
import { signOutAction } from "@/lib/actions/auth";
import { money } from "@/lib/money";
import { useBodyScrollLock, useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Brands", href: "/brands" },
  { label: "Offers", href: "/offers" },
  { label: "All Vendors", href: "/vendors" },
  { label: "Vendor Zone", href: "/vendor/login" },
];

const ACCOUNT_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Profile Info", href: "/dashboard", icon: User },
  { label: "My Orders", href: "/account/orders", icon: ShoppingBag },
  { label: "Wish List", href: "/account/wishlist", icon: Heart },
  { label: "Track Order", href: "/account/track-order", icon: Truck },
  { label: "Inbox", href: "/account/inbox", icon: Inbox },
  { label: "Support Ticket", href: "/account/support", icon: Headphones },
];

export type HeaderUser = { name: string; email: string; home: string; isCustomer: boolean } | null;
type Overlay = null | "searchCat" | "navCat" | "account" | "cart" | "drawer";

const menuItem =
  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold !text-fg transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:!text-primary";

function CategoryList({ onPick }: { onPick?: () => void }) {
  return (
    <ul className="flex flex-col p-2">
      {CATEGORY_MENU.map(({ name, slug, icon: Icon, tint }) => (
        <li key={slug}>
          <Link
            href={`/category/${slug}`}
            onClick={onPick}
            className="flex min-h-11 items-center gap-3 rounded-md px-2.5 text-sm font-semibold !text-fg transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:!text-primary"
          >
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm text-fg-strong", tint)}>
              <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            </span>
            <span className="flex-1">{name}</span>
            <ChevronRight aria-hidden className="size-4 text-fg-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StorefrontHeaderBar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const desktop = useMediaQuery("(min-width: 1025px)");
  const cart = useCart();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstName = user?.name.split(/\s+/)[0] ?? "";

  // Navigating closes menus (adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOverlay(null);
    setMobileSearch(false);
  }

  useBodyScrollLock(overlay === "drawer");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOverlay(null);
        setMobileSearch(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (mobileSearch) searchRef.current?.focus();
  }, [mobileSearch]);

  /** Hover-open on desktop pointers, tap-open on touch (CLAUDE.md §9). */
  const hoverable = (o: Exclude<Overlay, null | "drawer">) => ({
    onMouseEnter: canHover ? () => setOverlay(o) : undefined,
    onMouseLeave: canHover ? () => setOverlay((cur) => (cur === o ? null : cur)) : undefined,
  });
  // On hover devices the menu is already open when clicked, so a click must not toggle it shut.
  const tap = (o: Exclude<Overlay, null>) => () =>
    setOverlay((cur) => (cur === o && !(canHover && o !== "drawer") ? null : o));

  return (
    <>
      {/* Utility bar */}
      <div className="bg-inverse text-caption text-fg-subtle">
        <div className="mx-auto flex h-10 max-w-[var(--container-max)] items-center justify-center gap-5 px-[var(--container-pad)] sm:justify-between">
          <span className="hidden items-center gap-2 sm:flex">
            <Phone aria-hidden className="size-3.5" strokeWidth={2} />
            +1 (800) 555-0142
          </span>
          <div className="flex items-center gap-5">
            <Link href="/account/track-order" className="!text-fg-subtle hover:!text-on-primary">
              Track order
            </Link>
            <Link href="/account/support" className="!text-fg-subtle hover:!text-on-primary">
              Help Center
            </Link>
            <Link href="/vendor/login" className="flex items-center gap-1.5 font-semibold !text-accent hover:!text-saffron-50">
              <Store aria-hidden className="size-3.5" strokeWidth={2} />
              Become a Seller
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-card shadow-sm">
        <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-3 px-[var(--container-pad)] py-3.5 lg:gap-5">
          <button
            type="button"
            onClick={tap("drawer")}
            aria-label="Open menu"
            aria-expanded={overlay === "drawer"}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-card text-fg-strong lg:hidden"
          >
            <Menu aria-hidden className="size-5" strokeWidth={2} />
          </button>

          <Link href="/" className="hidden shrink-0 items-center gap-2.5 sm:flex" aria-label="Sundry home">
            <span className="grid size-9.5 place-items-center rounded-md bg-primary shadow-primary">
              <ShoppingBag aria-hidden className="size-5 text-on-primary" strokeWidth={2} />
            </span>
            <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.02em] text-fg-strong">Sundry</span>
          </Link>

          {/* Search pill (inline ≥1025px; toggled row below on smaller screens) */}
          <form action="/search" role="search" className="hidden h-12 min-w-0 flex-1 items-center rounded-full border border-line bg-sunken px-2 lg:flex">
            <div className="relative flex items-center" {...hoverable("searchCat")}>
              <button
                type="button"
                onClick={tap("searchCat")}
                aria-haspopup="menu"
                aria-expanded={overlay === "searchCat"}
                className="flex h-9 items-center gap-1.5 border-r border-line-default px-3 text-sm font-semibold whitespace-nowrap text-fg"
              >
                All Categories
                <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-(--dur-fast)", overlay === "searchCat" && "rotate-180")} />
              </button>
              {overlay === "searchCat" && (
                <div className="absolute top-full left-0 z-60 pt-3">
                  <CategoryMegaMenu onNavigate={() => setOverlay(null)} />
                </div>
              )}
            </div>
            <input
              name="q"
              type="search"
              aria-label="Search products"
              placeholder="Search products, brands and categories…"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
            />
            <button type="submit" className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-caption font-semibold text-on-primary hover:bg-primary-hover">
              <Search aria-hidden className="size-4" strokeWidth={2} />
              Search
            </button>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setMobileSearch((v) => !v)}
              aria-label={mobileSearch ? "Close search" : "Search"}
              aria-expanded={mobileSearch}
              className="grid size-11 place-items-center rounded-md text-fg lg:hidden"
            >
              {mobileSearch ? <X aria-hidden className="size-5" /> : <Search aria-hidden className="size-5" strokeWidth={1.9} />}
            </button>

            <Link href="/account/wishlist" className="flex min-h-11 flex-col items-center justify-center rounded-md px-2.5 !text-fg hover:!text-primary sm:px-3">
              <Heart aria-hidden className="size-5.5" strokeWidth={1.9} />
              <span className="mt-0.5 hidden text-[0.65rem] font-medium text-fg-muted sm:block">Wishlist</span>
            </Link>

            {/* Account */}
            <div className="relative max-sm:hidden" {...hoverable("account")}>
              <button
                type="button"
                onClick={tap("account")}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={overlay === "account"}
                className="flex min-h-11 items-center gap-2.5 rounded-md px-2.5"
              >
                <span className="grid size-9.5 shrink-0 place-items-center rounded-full bg-iris-50 text-primary">
                  <User aria-hidden className="size-5" strokeWidth={1.9} />
                </span>
                <span className="hidden flex-col text-left leading-tight md:flex">
                  <span className="text-[0.7rem] font-medium text-fg-muted">{user ? `Hello, ${firstName}` : "Hello, sign in"}</span>
                  <span className="flex items-center gap-1 text-sm font-bold text-fg-strong">
                    {user ? "Dashboard" : "Account"}
                    <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-(--dur-fast)", overlay === "account" && "rotate-180")} />
                  </span>
                </span>
              </button>
              {overlay === "account" && (
                <div className="absolute top-full right-0 z-60 pt-3">
                  <div role="menu" className="w-70 overflow-hidden rounded-lg border border-line bg-card shadow-xl">
                    {user ? (
                      <>
                        <Link href={user.home} className="flex items-center gap-3 border-b border-line bg-linear-120 from-iris-50 to-card p-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-on-primary">
                            {firstName.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-caption text-fg-muted">Hello, {firstName}</span>
                            <span className="block text-[0.9rem] font-bold text-fg-strong">My Dashboard</span>
                            <span className="block truncate text-caption text-fg-muted">{user.email}</span>
                          </span>
                        </Link>
                        {user.isCustomer && (
                          <div className="p-1.5">
                            {ACCOUNT_LINKS.map(({ label, href, icon: Icon }) => (
                              <Link key={href} href={href} role="menuitem" className={menuItem}>
                                <Icon aria-hidden className="size-[18px]" strokeWidth={1.9} />
                                {label}
                              </Link>
                            ))}
                          </div>
                        )}
                        <form action={signOutAction} className="border-t border-line p-1.5">
                          <button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-error-600 hover:bg-error-50">
                            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.9} />
                            Log Out
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="p-1.5">
                        <Link href="/login" role="menuitem" className={menuItem}>
                          <LogIn aria-hidden className="size-[18px]" strokeWidth={1.9} />
                          Sign in
                        </Link>
                        <Link href="/register" role="menuitem" className={menuItem}>
                          <UserPlus aria-hidden className="size-[18px]" strokeWidth={1.9} />
                          Create account
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart chip → MiniCart: hover-open on desktop, tap-open on touch */}
            <div className="relative ml-1" {...(desktop ? hoverable("cart") : {})}>
              <button
                type="button"
                onClick={tap("cart")}
                aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}, ${money(cart.subtotalCents)}`}
                aria-haspopup="dialog"
                aria-expanded={overlay === "cart"}
                className="flex min-h-11 items-center gap-2.5 rounded-full bg-primary-subtle py-2 pr-2.5 pl-3 sm:pr-4"
              >
                <span className="relative text-primary">
                  <ShoppingCart aria-hidden className="size-5.5" strokeWidth={1.9} />
                  <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-on-primary tabular-nums">
                    {cart.count}
                  </span>
                </span>
                <span className="hidden flex-col text-left leading-tight sm:flex">
                  <span className="text-[0.6rem] font-medium text-fg-muted">Cart total</span>
                  <span className="text-sm font-bold text-fg-strong tabular-nums">{money(cart.subtotalCents)}</span>
                </span>
              </button>
              {overlay === "cart" &&
                (desktop ? (
                  <div className="absolute top-full right-0 z-60 pt-3">
                    <MiniCart onClose={() => setOverlay(null)} />
                  </div>
                ) : (
                  <>
                    <div aria-hidden className="fixed inset-0 z-55 bg-inverse/35" onClick={() => setOverlay(null)} />
                    <div className="fixed top-18 right-2 left-2 z-60 sm:left-auto">
                      <MiniCart onClose={() => setOverlay(null)} />
                    </div>
                  </>
                ))}
            </div>
          </div>
        </div>

        {/* Mobile search row */}
        {mobileSearch && (
          <form action="/search" role="search" className="mx-auto flex max-w-[var(--container-max)] px-[var(--container-pad)] pb-3 lg:hidden">
            <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-primary bg-sunken px-2 shadow-[0_0_0_3px_var(--iris-100)]">
              <input
                ref={searchRef}
                name="q"
                type="search"
                aria-label="Search products"
                placeholder="Search products, brands…"
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-fg-strong outline-none placeholder:text-fg-subtle"
              />
              <button type="submit" aria-label="Search" className="grid size-8 place-items-center rounded-full bg-primary text-on-primary">
                <Search aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </div>
          </form>
        )}

        {/* Category nav */}
        <nav aria-label="Categories" className="relative border-t border-line">
          <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-2 px-[var(--container-pad)] py-2 lg:h-14 lg:py-0">
            <div className="relative flex h-full w-full items-center lg:w-auto" {...(desktop ? hoverable("navCat") : {})}>
              <button
                type="button"
                onClick={tap("navCat")}
                aria-haspopup="menu"
                aria-expanded={overlay === "navCat"}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4.5 text-sm font-semibold text-on-primary hover:bg-primary-hover lg:w-auto"
              >
                <LayoutGrid aria-hidden className="size-4" strokeWidth={2} />
                All Categories
                <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-(--dur-fast)", overlay === "navCat" && "rotate-180")} />
              </button>
              {overlay === "navCat" && desktop && (
                <div className="absolute top-full left-0 z-60 pt-2">
                  <CategoryMegaMenu onNavigate={() => setOverlay(null)} />
                </div>
              )}
            </div>
            <div className="hidden items-center lg:flex">
              {NAV_LINKS.map(({ label, href }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn("rounded-md px-3 py-2 text-sm font-semibold", active ? "!text-primary" : "!text-fg hover:!text-primary")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <span className="ml-auto hidden items-center gap-2 text-sm font-semibold text-accent-strong xl:flex">
              <Truck aria-hidden className="size-4.5" strokeWidth={2} />
              Free shipping on orders over $75
            </span>
          </div>
          {overlay === "navCat" && !desktop && (
            <>
              <div aria-hidden className="fixed inset-0 z-57 bg-inverse/35" onClick={() => setOverlay(null)} />
              <div className="absolute inset-x-0 top-full z-58 mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] pt-2">
                <MobileCategoryPanel onNavigate={() => setOverlay(null)} />
              </div>
            </>
          )}
        </nav>
      </header>

      {/* Drawer ≤1024px: Shop / My Account / More */}
      {overlay === "drawer" && (
        <>
          <div aria-hidden className="fixed inset-0 z-100 bg-inverse/55 backdrop-blur-[2px]" onClick={() => setOverlay(null)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed top-0 bottom-0 left-0 z-101 flex w-[min(340px,88vw)] flex-col overscroll-contain bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-md bg-primary">
                  <ShoppingBag aria-hidden className="size-5 text-on-primary" strokeWidth={2} />
                </span>
                <span className="font-display text-[1.3rem] font-extrabold tracking-[-0.02em] text-fg-strong">Sundry</span>
              </Link>
              <button type="button" onClick={() => setOverlay(null)} aria-label="Close menu" className="grid size-11 place-items-center rounded-full border border-line text-fg-muted">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain py-2">
              <p className="px-5 pt-3 text-[0.65rem] font-bold tracking-[0.08em] text-fg-subtle uppercase">Shop</p>
              <CategoryList onPick={() => setOverlay(null)} />
              <p className="px-5 pt-3 text-[0.65rem] font-bold tracking-[0.08em] text-fg-subtle uppercase">My Account</p>
              <div className="flex flex-col p-2">
                {user ? (
                  <>
                    <Link href={user.home} className={menuItem}>
                      <LayoutGrid aria-hidden className="size-5" strokeWidth={1.8} />
                      My Dashboard
                    </Link>
                    {user.isCustomer &&
                      ACCOUNT_LINKS.slice(1).map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href} className={menuItem}>
                          <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                          {label}
                        </Link>
                      ))}
                    <form action={signOutAction}>
                      <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-error-600 hover:bg-error-50">
                        <LogOut aria-hidden className="size-5" strokeWidth={1.8} />
                        Log Out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={menuItem}>
                      <LogIn aria-hidden className="size-5" strokeWidth={1.8} />
                      Sign in
                    </Link>
                    <Link href="/register" className={menuItem}>
                      <UserPlus aria-hidden className="size-5" strokeWidth={1.8} />
                      Create account
                    </Link>
                  </>
                )}
              </div>
              <p className="px-5 pt-3 text-[0.65rem] font-bold tracking-[0.08em] text-fg-subtle uppercase">More</p>
              <div className="flex flex-col p-2">
                {NAV_LINKS.slice(1).map(({ label, href }) => (
                  <Link key={href} href={href} className={menuItem}>
                    {label}
                  </Link>
                ))}
                <Link href="/account/support" className={menuItem}>
                  <Headphones aria-hidden className="size-5" strokeWidth={1.8} />
                  Help Center
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-line bg-saffron-50 px-4 py-3.5 text-caption font-semibold text-saffron-700">
              <Truck aria-hidden className="size-4.5" strokeWidth={2} />
              Free shipping on orders over $75
            </div>
          </aside>
        </>
      )}
    </>
  );
}
