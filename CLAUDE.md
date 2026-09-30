# CLAUDE.md — Sundry Marketplace

Read this file and `DESIGN_SYSTEM.md` before every task. `DESIGN_SYSTEM.md` is the single source of truth for visuals.

## 1. Project

**Sundry** is a premium multi-vendor e-commerce marketplace: many independent sellers, one storefront, one checkout. Four areas:

| Area | Route prefix | Who |
|---|---|---|
| Storefront | `/` | Shoppers (guests + customers) |
| Customer account | `/account` | Logged-in customers |
| Vendor (Seller) dashboard | `/vendor` | Store owners — see only their own data |
| Admin dashboard | `/admin` | Marketplace staff |

## 2. Stack

- **Next.js (App Router) + TypeScript (strict)** — Server Components by default; `"use client"` only for interactivity.
- **Tailwind CSS v4** — tokens in `app/globals.css` (copied verbatim from `DESIGN_SYSTEM.md` §11).
- **shadcn/ui** (Radix) for primitives, restyled with Sundry tokens.
- **lucide-react** icons · **next/font/google** (Bricolage Grotesque + Manrope) · **next/image**.
- **next-themes** (`attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`).
- **Chart.js + react-chartjs-2** for charts.
- **react-hook-form + zod** for forms · **Sonner** for toasts.
- **Stripe** (Checkout/Payment Element + Stripe Connect for seller payouts).
- Data layer: Prisma + PostgreSQL · Auth: Auth.js (NextAuth) with roles. (Change here if the team picks otherwise.)

Commands: `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` (add `"typecheck": "tsc --noEmit"`).

## 3. Non-negotiable rules

1. **Marketplace rule**
   - Every product shows **which seller** it comes from (seller name links to the store).
   - Carts group items under a **seller header**.
   - Orders are **split by seller** (one parent order → one sub-order per store, each with its own status).
   - **Sellers only ever see their own data.** Every vendor query is scoped by `storeId` on the server. Never trust a client-sent `storeId`.
2. **Payments are Stripe-only** (Card via Stripe, Stripe Wallet: Apple Pay / Google Pay / Link). **No Cash on Delivery.**
3. **Not in this project:** Auctions · Publication House / Authors / Creators filters · Chat With Vendor (use the **Sundry AI Support** agent instead) · Google Maps address picker · currency/language switchers.
4. **Design tokens only.** No hex/rgb values in components. Use Tailwind token utilities or `var(--token)`. No new colors, radii, shadows or font sizes.
5. **Every data surface has 4 states:** Default · Loading skeleton · Empty · Error (with Retry).
6. **Responsive at every width** — test 360, 390, 768, 1024, 1280, 1440. No horizontal page scroll. Tables → cards at ≤1200px. Touch targets ≥44px. Hover-only actions must be reachable on touch.
7. **Every action button has a leading Lucide icon.** Icon-only buttons need `aria-label`.
8. **Real content** in seeds and fixtures — real product names, prices, sellers. No lorem ipsum, no "Product 1".

## 4. Folder structure

```
app/
  layout.tsx                 # fonts, ThemeProvider, <html data-theme>, Toaster
  globals.css                # tokens (DESIGN_SYSTEM.md §11)
  (storefront)/layout.tsx    # StorefrontHeader + Footer (forcedTheme light)
  (auth)/layout.tsx          # /login + /register: minimal AuthHeader only (no storefront header/footer)
  (account)/account/layout.tsx   # storefront header + AccountSidebar
  vendor/(auth)/…            # vendor login/register (simple header, no sidebar)
  vendor/(panel)/layout.tsx  # VendorShell: top bar + rail/panel sidebar
  admin/layout.tsx           # AdminShell: same frame + search + theme dropdown
components/
  ui/            # shadcn primitives (button, badge, card, input, dialog, …)
  commerce/      # ProductCard, SellerCard, MiniCart, QuickViewModal, CategoryMegaMenu, CheckoutStepper
  shell/         # StorefrontHeader, MobileDrawer, AccountSidebar, DashShell, DashSidebar, ThemeMenu
  data/          # DataTable (table→cards), StatCard, WalletCard, Chart, StatusBadge
  states/        # Skeletons, EmptyState, ErrorState, PreviewState
lib/             # db, auth, stripe, money(), format(), zod schemas, permissions
design/          # the approved .dc.html design files (read-only reference)
```

## 5. Route map (design file → route)

**Storefront** — `Sundry Home` → `/` · `Category Page` → `/category/[slug]` · `Product Detail Page` → `/product/[slug]` · `Cart Page` → `/cart` · `Checkout Page` → `/checkout` (steps: Shipping & Billing → Payment; success opens the Thank-you modal) · `Order Complete` → `/checkout/complete` · `All Vendor Page` → `/vendors` · `Vendor Details Page` → `/vendors/[slug]` · `Login Page` → `/login` · `Register Page` → `/register`

**Account** — `user.dashboard` → `/dashboard` · `userOrder` → `/account/orders` · `userorderdetails` → `/account/orders/[id]` · `usertrackorder` → `/account/track-order` · `userwishlist` → `/account/wishlist` · `useraddress` → `/account/addresses` · `userchat` → `/account/inbox` (tabs: Support = Sundry AI Support, Deliveryman) · `supportticket` → `/account/support`

**Vendor** — `vendorLogin` → `/vendor/login` · `vendorregister` → `/vendor/register` · `vendordashboard` → `/vendor/dashboard` · `vendorProfile` → `/vendor/profile` · `vendorchangepassword` → `/vendor/change-password` · `vendorproductlist` → `/vendor/products` · `vendoraddproduct` → `/vendor/products/new` · `vendoreditproduct` → `/vendor/products/[id]/edit` · `vendorproductreview` → `/vendor/reviews` · `vendororderlist` → `/vendor/orders` · `vendororderdetails` → `/vendor/orders/[id]` · `vendorcoupon` → `/vendor/coupons` · `vendorproductreport` / `vendororderreport` / `vendortransactionreport` → `/vendor/reports/{products|orders|transactions}`

**Admin** — `admindashboard` → `/admin/dashboard` · `adminallorders` → `/admin/orders` · `adminproductlist` → `/admin/products` · `adminproductadd` → `/admin/products/new` · `adminvendorproductlist` → `/admin/products/requests` · `adminproductdetail` → `/admin/products/[id]` · `adminproductstock` → `/admin/products/stock` · `adminvendorlist` → `/admin/vendors` · `adminaddvendor` → `/admin/vendors/new` · `admincustomerlist` → `/admin/customers` · `admincustomerreview` → `/admin/customers/reviews` · `adminearningreports` / `adminorderreport` / `adminproductreport` / `admintransactionreport` → `/admin/reports/{earnings|orders|products|transactions}`

Reference only (not routes): `Design System`, `Component States`, `Mobile Layout`, `Canvas`.

## 6. Data model (essentials)

- **User** — `role: CUSTOMER | VENDOR | ADMIN`; a VENDOR owns exactly one **Store**.
- **Store** — name, slug, logo, banner, tagline, status (`PENDING | ACTIVE | SUSPENDED`), `isOpen`, rating, `stripeAccountId` (Stripe Connect), commission rate.
- **Product** — `storeId` (required), name, slug, category, brand, price, compareAt, stock, SKU, images, variants, status (`DRAFT | PENDING_REVIEW | APPROVED | DENIED`). Vendor products need admin approval.
- **Cart / CartItem** — items carry `storeId`; UI groups by store.
- **Order** (parent: customer, addresses, Stripe PaymentIntent, totals) → **StoreOrder** (one per store: items, subtotal, shipping, tax, commission, **status**) → **OrderItem**.
- StoreOrder status: `PENDING → CONFIRMED → PACKAGING → OUT_FOR_DELIVERY → DELIVERED` · plus `RETURNED · FAILED · CANCELED`. Payment status: `UNPAID | PAID | REFUNDED`. Map to colors with `StatusBadge` (DESIGN_SYSTEM.md §6).
- **Review**, **Coupon** (scoped to a store), **Address** (type: Home | Office | Other), **SupportTicket**, **WishlistItem**, **Payout/Transaction**.
- Money is stored as **integer cents**; format with `money()` (`$1,159.00`, tabular-nums). Discounts render as `−35%` (true minus).

## 7. Security & permissions

- Authorize **on the server** in every Server Action / Route Handler: `requireRole()` + ownership checks.
- Vendor queries: always `where: { storeId: session.storeId }`. Admin can see everything. Customers see only their own orders, addresses, tickets.
- Validate every input with zod. Never expose secrets to client components.
- Stripe webhooks (`/api/stripe/webhook`) are the source of truth for payment status.

## 8. Coding standards

- Server Components fetch data; client components handle interaction only. Keep `"use client"` boundaries small.
- Mutations via Server Actions + `revalidatePath`/`revalidateTag`. Optimistic UI for cart and wishlist.
- Route-level `loading.tsx` (skeleton matching the page) and `error.tsx` (ErrorState + Retry) in every segment.
- Components: PascalCase files, named exports, typed props. No inline styles except for true runtime values (e.g. progress width).
- Use `cn()` (clsx + tailwind-merge) for class composition. Variants via `cva`.
- No hardcoded colors or magic numbers — tokens only. If something is missing, stop and ask; don't invent.
- Accessibility: labels on inputs, `aria-label` on icon buttons, focus-visible rings, dialogs trap focus, `Escape` closes overlays.
- Images through `next/image` with explicit sizes. Fonts through `next/font` (variables `--font-bricolage`, `--font-manrope` on `<html>`).

## 9. UX behaviors to preserve (already approved in the designs)

- **Auth pages (`/login`, `/register`):** minimal header (logo · Home · Sell on Sundry · Start selling → `/vendor/login`), no footer, two-column card (Iris brand panel + form; panel hidden ≤900). The design files were updated to match.
- **Header (storefront):** "All Categories" in the search pill **and** the nav button both open the two-pane mega-menu (hover on desktop, tap on touch, no dead zone). ≤1024: compact row ☰ · search · wishlist · cart; logo hidden ≤720; the category panel floats over content; drawer = Shop / My Account / More.
- **MiniCart:** hover-open on desktop, tap-open on touch; items grouped by seller; qty stepper recalculates subtotal/total; free-shipping bar turns green at the threshold.
- **Product cards:** hover lift; quick-view eye opens QuickViewModal; wishlist toggle; add-to-cart. On touch these controls are always visible.
- **Checkout:** stepper Cart → Shipping & Billing → Payment. "Proceed to Payment" only advances after Shipping & Billing. "Same as shipping address" collapses billing. Place Order is **disabled until Terms are accepted**. Success = Thank-you modal (Order ID + Copy, Track Order, Continue Shopping).
- **Vendor/Admin shell:** back-arrow collapses the sidebar, ☰ reopens it; ≤1200 the panel is a floating drawer; ≤720 a 320px drawer; header icons fold into a "⋯" menu; profile dropdown (Profile Setting / Change Password / Log out).
- **Admin themes:** dropdown Light / Dark / System; switching must not flash (`disableTransitionOnChange`).
- **Charts:** staggered entrance animations, animate on scroll-into-view and when filters change; respect reduced motion.
- **One overlay at a time**, `Escape` closes all, body scroll locked under modals/drawers, instant re-layout on resize.

## 10. How to build a page from a design

1. Open the matching file in `design/` (e.g. `design/vendororderlist.dc.html`) — it is the approved reference for **layout, content density, copy and behavior**.
2. Rebuild it with the shared shell and components (§4). Do not copy inline styles; translate them to token utilities.
3. Implement all 4 states, responsive tiers (DESIGN_SYSTEM.md §4) and the interactions listed in §9.
4. Wire real data + server-side permissions. Link every nav item to its real route (§5).

## 11. Definition of done

- [ ] Matches the design file's structure and copy; uses only tokens and shared components.
- [ ] Default / Loading / Empty / Error states present.
- [ ] No horizontal overflow at 360 · 390 · 768 · 1024 · 1280 · 1440; tables become cards ≤1200.
- [ ] Keyboard + screen-reader usable; icon buttons labelled; focus visible.
- [ ] Marketplace rule respected (seller shown, carts/orders split by seller, vendor data scoped).
- [ ] Stripe-only; none of the excluded features (§3.3).
- [ ] `npm run lint` and `npm run typecheck` pass; no console errors.

