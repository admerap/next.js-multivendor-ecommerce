# Sundry — Design System

> Single source of truth for every visual decision in the Sundry codebase.
> If a value is not in this document, it does not exist. Do not invent colors, sizes, radii, shadows or components.

Sundry is a premium multi-vendor marketplace: thousands of independent sellers, one storefront, one checkout. The visual goal is **"2026 premium department store"**: calm neutral canvas, generous space, soft elevation, and a single confident brand color used sparingly.

---

## 1. Brand

| | |
|---|---|
| Name | **Sundry** (wordmark set in Bricolage Grotesque 800, tracking −0.02em) |
| Logomark | Shopping-bag glyph, white on an Iris rounded square (38×38, radius 11px, `--shadow-primary`) |
| Primary | **Iris** `#6A2FD6`, a deep grape violet. Accent, never a flood. |
| Accent | **Saffron** `#EFA524`, warm gold. Deals, countdowns, ratings, highlights only. |
| Voice | Confident, warm, plain-spoken, second person. Never corporate. |

**Content rules**
- Title Case for headings and navigation ("Flash Deal", "Top Sellers"). Sentence case for body copy.
- UPPERCASE only for tiny eyebrows/labels (12px, tracking 0.08em): "HANDPICKED", "PREVIEW STATE".
- Real content only: real product names, real prices, real seller names. Never "Product 1", never lorem ipsum.
- Money: `$1,159.00` with tabular figures. Compare-at price struck through. Discounts use a true minus: `−35%` (U+2212), not a hyphen.
- No emoji anywhere. Icons carry all glyph meaning.

---

## 2. Tokens

All tokens are CSS custom properties defined in `app/globals.css` (full file in §11). **Components never contain hex values.** They use Tailwind utilities mapped to these tokens, or `var(--token)`.

### 2.1 Color scales

**Iris (primary)**
| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#F5F2FE` | `#ECE5FD` | `#D9CBFB` | `#BEA6F5` | `#9E77EC` | `#7F4EE0` | **`#6A2FD6`** | `#5A25B4` | `#4A2091` | `#3D1D75` | `#260F4D` |

**Saffron (accent)**
| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 |
|---|---|---|---|---|---|---|---|
| `#FEF7EC` | `#FCEBCB` | `#F8D48E` | `#F3BC53` | **`#EFA524`** | `#E08A0B` | `#C06D06` | `#99530A` |

**Neutral (warm grey)**
| 0 | 50 | 100 | 150 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `#FFFFFF` | `#FAFAFB` | `#F4F4F6` | `#EDEDF1` | `#E6E6EC` | `#D5D5DE` | `#A9A9B7` | `#78788A` | `#565668` | `#3E3E4E` | `#2A2A37` | `#1A1A23` | `#101017` |

**Status** (muted, never neon)
| | 50 (bg) | 500 (solid) | 600 (text) |
|---|---|---|---|
| Success | `#E9F8EF` | `#15925A` | `#0F7A4A` |
| Warning | `#FEF6E7` | `#D9960C` | `#B67A08` |
| Error | `#FDECEE` | `#E23744` | `#C31F2C` |
| Info | `#E9F6F6` | `#0E9C9A` | `#0B7E7C` |

### 2.2 Semantic tokens (use these, not raw scales, whenever a semantic exists)

| Token | Light value | Purpose |
|---|---|---|
| `--color-primary` | iris-600 | Primary buttons, links, active nav, eyebrows |
| `--color-primary-hover` | iris-700 | Hover of primary |
| `--color-primary-active` | iris-800 | Pressed |
| `--color-primary-subtle` | iris-50 | Selected rows, active nav background, chips |
| `--color-primary-border` | iris-200 | Borders of selected/primary-tinted elements |
| `--color-on-primary` | neutral-0 | Text on primary |
| `--color-accent` | saffron-400 | Deal highlights |
| `--color-accent-strong` | saffron-500 | Text-strength accent |
| `--color-accent-subtle` | saffron-50 | Deal backgrounds |
| `--color-rating` | saffron-400 | Stars |
| `--text-strong` | neutral-900 | Headings, prices, key values |
| `--text-body` | neutral-700 | Body copy |
| `--text-muted` | neutral-500 | Secondary copy, labels |
| `--text-subtle` | neutral-400 | Placeholders, timestamps |
| `--text-compare` | neutral-400 | Struck-through compare-at price |
| `--surface-page` | neutral-50 | App canvas |
| `--surface-card` | neutral-0 | Cards, header, panels |
| `--surface-sunken` | neutral-100 | Inputs on cards, table headers, tracks |
| `--surface-hover` | neutral-100 | Row/item hover |
| `--surface-inverse` | neutral-900 | Utility bar, footer, toasts |
| `--border-subtle` | neutral-200 | Hairlines (default border) |
| `--border-default` | neutral-300 | Input borders, dividers that must be visible |
| `--border-strong` | neutral-400 | Rare; strong separation |

**Color discipline**
- Iris appears only on: primary actions, active states, links, eyebrows, focus rings, and at most one or two hero/promo grounds per page.
- Saffron appears only on deals, countdowns, ratings and "Best Seller"-type highlights.
- Maximum 1–2 saturated background grounds per page.
- Text contrast ≥ 4.5:1 (≥ 3:1 only for headline-scale type).

### 2.3 Typography

| Role | Family | Token / size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| Display | Bricolage Grotesque | `--text-display` 56px (3.5rem) | 800 | 1.1 | −0.02em |
| H1 | Bricolage Grotesque | `--text-h1` 40px | 800 | 1.1 | −0.02em |
| H2 | Bricolage Grotesque | `--text-h2` 32px | 700–800 | 1.25 | −0.02em |
| H3 | Bricolage Grotesque | `--text-h3` 24px | 700 | 1.25 | −0.01em |
| H4 | Bricolage Grotesque | `--text-h4` 20px | 700 | 1.25 | −0.01em |
| Body large | Manrope | `--text-lg` 18px | 400–500 | 1.65 | 0 |
| Body | Manrope | `--text-base` 16px | 400–500 | 1.5 | 0 |
| Small / UI | Manrope | `--text-sm` 14px | 500–600 | 1.5 | 0 |
| Caption | Manrope | `--text-caption` 12px | 500–700 | 1.5 | 0 (eyebrows: 0.08em, uppercase) |

- Headings scale fluidly on small screens: `font-size: clamp(min, vw, max)` (e.g. H1 `clamp(1.75rem, 4vw, 2.5rem)`).
- Prices, counters, IDs and table numbers always use `font-variant-numeric: tabular-nums` (`tabular-nums` utility).
- Price hierarchy on a card: price 16–18px/800 `--text-strong` → compare-at 13px `--text-compare` line-through → discount badge.
- Root font size is **17px** (`html { font-size: 17px }`). This deliberately scales the whole rem-based system ≈106%, as approved on the Home page.
- Fonts load through `next/font/google`: `Bricolage_Grotesque` (variable, opsz 12–96, wght 400–800) and `Manrope` (400–800).

### 2.4 Spacing

8px base scale with 4px half-steps. Use only these values:

`4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 96` px

Tailwind equivalents: `1 · 2 · 3 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24`. Never use `p-5`/`gap-5` (20px) or `p-7` (28px) unless matching an existing component spec.

| Context | Value |
|---|---|
| Section rhythm (storefront) | 56–64px between sections (`py-14`/`py-16`) |
| Card padding | 14–24px (`p-4` compact, `p-6` default) |
| Grid gaps | `gap-[clamp(10px,2vw,16px)]` for product grids, 16–24px elsewhere |
| Form field gap | 16–20px vertical, 14–16px horizontal |

### 2.5 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Tiny markers |
| `--radius-sm` | 6px | Small badges, thumbnails in lists |
| `--radius-md` | 10px | **Buttons, inputs, selects, icon buttons** |
| `--radius-lg` | 14px | **Cards, tables, panels, dropdowns** |
| `--radius-xl` | 20px | Hero panels, modals, bottom sheets |
| `--radius-2xl` | 28px | Wide promo banners |
| `--radius-full` | 9999px | Pills, badges, avatars, search bar |

### 2.6 Elevation

Structure comes from **soft shadows and surface tints, not grey boxes.** Hairline `--border-subtle` is allowed; hard grey outlines are not.

| Token | Value |
|---|---|
| `--shadow-xs` | `0 1px 2px rgba(26,26,35,.04)` |
| `--shadow-sm` | `0 1px 3px rgba(26,26,35,.06), 0 1px 2px rgba(26,26,35,.04)` (card at rest) |
| `--shadow-md` | `0 4px 12px rgba(26,26,35,.06), 0 2px 4px rgba(26,26,35,.04)` |
| `--shadow-lg` | `0 12px 28px rgba(26,26,35,.08), 0 4px 10px rgba(26,26,35,.04)` (card hover) |
| `--shadow-xl` | `0 24px 48px rgba(26,26,35,.12), 0 8px 16px rgba(26,26,35,.05)` (modals, dropdowns) |
| `--shadow-primary` | `0 8px 24px rgba(106,47,214,.28)` (primary button hover, logomark) |

### 2.7 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 140ms | Hovers, color changes, toggles |
| `--dur-med` | 220ms | Cards, dropdowns, drawers |
| `--dur-slow` | 360ms | Large panels, page-level reveals |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Default easing |
| `--ease-inout` | `cubic-bezier(.65,0,.35,1)` | Symmetric transitions |

- Card hover: `translateY(-4px)` plus `--shadow-sm → --shadow-lg`, over `--dur-med`.
- Primary button hover: iris-600 → iris-700, `translateY(-1px)`, gains `--shadow-primary`. Press returns to rest.
- No bounces, no parallax, no infinite decorative loops (the skeleton shimmer is the only loop).
- Always honor `prefers-reduced-motion: reduce`: disable transforms, chart animations and shimmer.

---

## 3. Themes (Light · Dark · System)

- Implemented with `next-themes`: `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`, **`disableTransitionOnChange`**. The last one prevents the color "flash" when switching.
- The theme switcher is a **dropdown** (Sun / Moon / Monitor icons, labels Light · Dark · System, with a check on the active item). It is not three separate icons.
- **Admin area:** the theme switcher is required. **Storefront, Account and Vendor areas:** render light (`forcedTheme="light"`) until their dark designs are approved. The tokens are already dark-ready.
- Dark mode only **remaps tokens** (see `html[data-theme="dark"]` in §11). Components contain zero theme-specific code; they read the tokens and switch automatically.
- Charts read their colors from CSS variables at render time and re-render on theme change.

---

## 4. Layout & responsive

### 4.1 Containers

| Token | Value |
|---|---|
| `--container-max` | 1600px |
| `--container-pad` | 40px desktop · 24px ≤1024px · 16px ≤640px |

Page wrapper: `mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]`.

### 4.2 Breakpoints

Tailwind is mobile-first. The design's max-width tiers map onto these `min-width` breakpoints:

| Tailwind | Min width | Design tier (max-width) |
|---|---|---|
| (base) | 0 | Phone ≤480 |
| `xs:` | 481px | Large phone ≤720 |
| `sm:` | 721px | Tablet portrait ≤900 |
| `md:` | 901px | Tablet landscape ≤1024 |
| `lg:` | 1025px | Laptop ≤1200 — **desktop header starts here** |
| `xl:` | 1201px | Desktop — **full sidebars and full tables start here** |
| `2xl:` | 1441px | Wide |

### 4.3 Responsive rules (non-negotiable)

1. **Fluid first.** Use `repeat(auto-fill, minmax(min(Xpx,100%),1fr))`, `clamp()`, `flex-wrap` and `minmax(0,1fr)`. Fixed widths only for fixed-format items (avatars, icons, thumbnails).
2. **Nothing overflows the viewport** at 360, 390, 768, 1024 or 1280px. No horizontal page scroll, ever.
3. **Tables become cards at ≤1200px** (`xl:` shows the table). Each card shows a labeled `label: value` grid. Horizontal-scroll tables are not allowed, except wide report tables on desktop.
4. **Touch:** hit targets ≥ 44×44px. Anything revealed on hover must also be reachable on touch devices. Under `@media (hover: none)` these are always visible: quick-view eye, add-to-cart, row actions.
5. **One overlay at a time.** Opening the drawer, mini-cart, account menu, category panel, search or a modal closes the others. `Escape` closes everything. Body scroll is locked while a modal or drawer is open.
6. **Resize is instant.** Transitions are disabled during window resize (debounced class on `<html>`), so layout never lags.
7. **Mobile patterns:** modals become bottom sheets (≤720), toasts span the full width at the bottom and respect `env(safe-area-inset-bottom)`, and drawer lists use `overscroll-behavior: contain`.

### 4.4 Shells (four distinct frames)

| Shell | Used by | Desktop (≥1025) | ≤1024 |
|---|---|---|---|
| **Storefront** | Home, Category, Product, Cart, Checkout, Vendors, Login/Register | Utility bar (inverse) → header (logo · pill search with "All Categories" dropdown · wishlist · account · cart chip with count and total) → category nav (All Categories mega-menu button · links · promo) → content → footer | Single compact row: ☰ · search icon · wishlist · cart. Logo hidden ≤720. The All Categories bar stays visible and its panel floats over content. Drawer: Shop / My Account / More |
| **Account** | `/account/*` | Storefront header with "Hello, {name} · Dashboard" chip → left account sidebar (profile card + nav) → content | Sidebar stacks full width above content |
| **Vendor** | `/vendor/*` | Sticky 68px top bar (brand · back-arrow sidebar toggle · breadcrumbs · icons · profile dropdown: Profile Setting / Change Password / Log out) → 64px icon rail + 216px section panel → main | ≤1200: rail only; the toggle opens the panel as a floating drawer with backdrop. ≤720: rail hidden, the toggle opens a 320px drawer. Header icons collapse into a "⋯" menu |
| **Admin** | `/admin/*` | Same frame as Vendor plus a header search (with ⌘K / Ctrl K hint) and the theme dropdown | Same as Vendor. Search collapses to an icon |

The vendor/admin sidebar collapses with the existing back-arrow icon and reopens with a **menu (☰) icon**.

---

## 5. Components

All components are built on shadcn/ui primitives and styled with these tokens. The names below are canonical; use them in code.

### Core

| Component | shadcn base | Spec |
|---|---|---|
| **Button** | Button | Variants: `primary` (iris bg, white), `secondary` (card bg, `--border-subtle`, hover iris text and border), `ghost` (transparent, hover `--surface-hover`), `accent` (saffron-400, neutral-900 text), `danger` (error-50 bg, error-600 text). Sizes: sm 36px · md 44px · lg 52px. Radius md, weight 600, gap 8px. **Every action button carries a leading Lucide icon** (16–18px). Icon-only buttons need an `aria-label`. |
| **Badge** | Badge | Pill, 11.5–12px/700, padding 3px 10px. Variants: `discount` (error-50/error-600, text "−20%"), `new` (success-50/success-600), `hot`, `accent` (saffron-50/saffron-700), `neutral`. Never loud solid-red rectangles. |
| **StatusBadge** | Badge | Pill with a 6px `currentColor` dot and a label. Colors per §6. |
| **Card** | Card | `--surface-card`, radius lg, `--shadow-sm`, optional hairline border, padding 16–24px. `interactive` variant: hover lift. |
| **Input / Select / Textarea** | Input, Select, Textarea | Height 44–46px, radius md, `--border-subtle`, bg `--surface-card` (or `--surface-sunken` inside cards). Focus: border `--color-primary` plus ring `0 0 0 3px var(--iris-50)`. Error: border error-500 plus helper text error-600, 12px. Label 13px/600 `--text-body`; required marker `*` in error-500. |
| **Checkbox / Radio / Switch** | Checkbox, RadioGroup, Switch | 18–20px, radius 5px / full; checked = iris fill with white check. Selected option cards: 1.5px iris border plus `--color-primary-subtle` bg. |
| **Tabs** | Tabs | Two styles: *underline* (2px iris bottom border on active, 14–15px/700) for page sections, and *segmented pill* (sunken track, white active pill) for filters and Preview State. |
| **StarRating** | — | 5 stars (`--color-rating`), sizes 14/15/18px, optional "(128)" count in `--text-muted`. |
| **Avatar** | Avatar | Circle, initials on `--iris-50` / iris text when no image. |
| **Dropdown / Popover** | DropdownMenu, Popover | Radius lg, `--shadow-xl`, hairline border, 6–8px inner padding, items 40–44px, hover `--surface-hover`. Hover-open on desktop pointers; tap-open on touch. No dead zone between trigger and panel (padding bridge). |
| **Dialog / Sheet** | Dialog, Sheet | Overlay `rgba(26,26,35,.55)` plus 2px blur. Panel radius xl, `--shadow-xl`, close X top-right (36px circle). ≤720 becomes a bottom sheet. |
| **Toast** | Sonner | `--surface-inverse` bg, white text, radius md, bottom-right (full-width bottom on mobile), 3s. |
| **Skeleton** | Skeleton | `--neutral-100 → --neutral-150` shimmer (1.4s). Mirrors the exact shape of the loaded component. |
| **EmptyState** | — | 72–76px circle (iris-50 bg, iris-400 icon) · H3 20px · 14px muted copy (max 380px) · primary Button with icon. |
| **ErrorState** | — | Same as EmptyState with error-50 / error-500 icon (triangle alert) and a "Retry" button (rotate-ccw icon). |
| **PreviewState** | Tabs (segmented) | Dev/design switcher "PREVIEW STATE: Default · Loading · Empty · Error", placed at the top-right of the page title row. Render it only when `NEXT_PUBLIC_SHOW_PREVIEW_STATE=true`. |

### Commerce

| Component | Spec |
|---|---|
| **ProductCard** | **The marketplace card.** Square image tile (category-tinted placeholder or photo) · discount badge top-left · wishlist toggle top-right (`rgba(255,255,255,.85)` plus 6px backdrop blur) · quick-view eye centered on hover · **seller name (required, iris, links to the store)** · title (2 lines max, 14–15px/600) · price + compare-at + discount · StarRating with count · add-to-cart. Hover: lift. |
| **SellerCard** | Banner tint · circular logo (74px, white ring, "Closed Now" overlay when closed) · name · verified check · rating and reviews · product count · "Visit store" CTA. |
| **MiniCart** | Popover (≈404px) opened from the cart chip. **Items grouped under a seller header** (store name plus verified check) · qty stepper · free-shipping progress bar (turns success-green when the threshold is reached) · subtotal row · "Expand cart" plus a "Proceed to checkout" primary button. ≤1024: fixed panel under the header with backdrop, tap-to-open. |
| **QuickViewModal** | Gallery with thumbnails · seller · title · rating · price · variant/qty · Add to cart / Buy now. |
| **CategoryMegaMenu** | Two panes: category list (icon tile + name + chevron, active = iris-50 row) and 2-column subcategory groups (H4 16px/800 + links 14px). |
| **CheckoutStepper** | Cart ✓ → Shipping & Billing → Payment. Done = iris circle with check, active = iris circle with white dot, pending = outlined. |
| **StatCard** | Icon tile (40–44px, tinted) · label 13px muted · value 22–28px/800 tabular · optional delta. |
| **WalletCard** | Iris gradient panel (iris-700 → iris-900 plus radial glow), white text (`rgba(255,255,255,.78)` for secondary copy), big balance, plus a 2×2 grid of mini stats. |
| **DataTable** | Header row on `--surface-sunken`, 12px/700 uppercase muted. Rows 14px, hover `--surface-hover`, actions right-aligned. Becomes cards ≤1200px (§4.3.3). Search, filters and export sit above the table; pagination below. |
| **Chart** | Chart.js via `react-chartjs-2`. Colors from tokens: iris-600 primary series, saffron-400 secondary, info-500 tertiary, neutral-300 grid. Entrance: bars grow with a 55ms stagger, lines rise from zero, doughnuts sweep. Animates when scrolled into view (IntersectionObserver). Updates tween between values. Disabled under reduced motion. |

---

## 6. Status colors (canonical map)

| Status | Variant | Colors (bg / fg) |
|---|---|---|
| Pending | info | info-50 / info-600 |
| Confirmed | primary | iris-50 / iris-700 |
| Packaging · Processing | warning | warning-50 / warning-600 |
| Out for Delivery · Shipped | primary | iris-50 / iris-700 |
| Delivered · Completed · Paid · Approved · Active · Resolved | success | success-50 / success-600 |
| Returned · Closed · Inactive | neutral | neutral-100 / neutral-600 |
| Failed to Deliver · Canceled · Rejected · Unpaid · Refunded · Open (ticket) · Urgent | error | error-50 / error-600 |
| Refund Requested · On Hold · Low Stock | warning | warning-50 / warning-600 |

Ticket priority: Low → neutral · Medium → info · High → warning · Urgent → error.

---

## 7. Iconography

- **Lucide** only (`lucide-react`), outline, stroke 1.8–2, rounded joins.
- Sizes: 16px (inline and buttons) · 18–20px (nav, header) · 22px (header actions) · 36–44px (empty states).
- Category icons: Smartphone (phones), Shirt (men), ShoppingBag (women), Smile (kids), Sparkles (beauty), Sofa (home), Cpu (electronics), Dumbbell (sports), Headphones (audio), Gem (jewelry).
- No emoji. No unicode symbols as icons.

---

## 8. Imagery

- Product images: square tiles on soft category tints. Tech `--iris-50` · Women `#FCEEF3` · Beauty `#FDEFF4` · Home `#EEF4F0` · Kids `#FEF6E7` · Men `#EEF1F6` · Sports `#EAF5F2`. These tints are the **only** extra hex values allowed; define them once as `--tint-*` tokens.
- Real photography: well-lit, uncluttered, on white or tinted grounds, `object-fit: cover`, rendered with `next/image`.
- Hero and promo grounds: iris-700 → iris-900 two-stop gradient plus a low-opacity radial glow. No textures, no busy patterns.

---

## 9. Accessibility

- WCAG 2.2 AA. Visible focus on every interactive element (iris ring).
- Semantic HTML: `header`, `nav`, `main`, `aside`, `footer`; tables use `role="table"` / `row` semantics even in card mode.
- Dialogs trap focus and restore it on close. Menus use `aria-haspopup` and `aria-expanded`.
- Every icon-only control has an `aria-label`. Decorative SVGs are `aria-hidden`.
- Form errors are linked with `aria-describedby`.

---

## 10. Page states

**Every data-driven surface ships four states:** Default · Loading (skeleton that matches the layout) · Empty (EmptyState with a primary CTA) · Error (ErrorState with Retry). Next.js: `loading.tsx` for route skeletons, `error.tsx` for route errors, component-level EmptyState for zero results.

---

## 11. `app/globals.css` (Tailwind v4)

```css
@import "tailwindcss";

/* ---------- Raw scales + semantic tokens (source of truth) ---------- */
:root {
  --iris-50:#F5F2FE; --iris-100:#ECE5FD; --iris-200:#D9CBFB; --iris-300:#BEA6F5; --iris-400:#9E77EC;
  --iris-500:#7F4EE0; --iris-600:#6A2FD6; --iris-700:#5A25B4; --iris-800:#4A2091; --iris-900:#3D1D75; --iris-950:#260F4D;
  --saffron-50:#FEF7EC; --saffron-100:#FCEBCB; --saffron-200:#F8D48E; --saffron-300:#F3BC53;
  --saffron-400:#EFA524; --saffron-500:#E08A0B; --saffron-600:#C06D06; --saffron-700:#99530A;
  --neutral-0:#FFFFFF; --neutral-50:#FAFAFB; --neutral-100:#F4F4F6; --neutral-150:#EDEDF1; --neutral-200:#E6E6EC;
  --neutral-300:#D5D5DE; --neutral-400:#A9A9B7; --neutral-500:#78788A; --neutral-600:#565668; --neutral-700:#3E3E4E;
  --neutral-800:#2A2A37; --neutral-900:#1A1A23; --neutral-950:#101017;
  --success-50:#E9F8EF; --success-500:#15925A; --success-600:#0F7A4A;
  --warning-50:#FEF6E7; --warning-500:#D9960C; --warning-600:#B67A08;
  --error-50:#FDECEE;   --error-500:#E23744;   --error-600:#C31F2C;
  --info-50:#E9F6F6;    --info-500:#0E9C9A;    --info-600:#0B7E7C;

  --tint-tech:var(--iris-50); --tint-women:#FCEEF3; --tint-beauty:#FDEFF4; --tint-home:#EEF4F0;
  --tint-kids:#FEF6E7; --tint-men:#EEF1F6; --tint-sports:#EAF5F2;

  --text-strong:var(--neutral-900); --text-body:var(--neutral-700); --text-muted:var(--neutral-500);
  --text-subtle:var(--neutral-400); --text-compare:var(--neutral-400); --text-on-dark:var(--neutral-0);
  --surface-page:var(--neutral-50); --surface-card:var(--neutral-0); --surface-sunken:var(--neutral-100);
  --surface-hover:var(--neutral-100); --surface-inverse:var(--neutral-900);
  --border-subtle:var(--neutral-200); --border-default:var(--neutral-300); --border-strong:var(--neutral-400);

  --space-1:.25rem; --space-2:.5rem; --space-3:.75rem; --space-4:1rem; --space-5:1.5rem; --space-6:2rem;
  --space-7:2.5rem; --space-8:3rem; --space-9:4rem; --space-10:5rem; --space-12:6rem;
  --container-max:1600px; --container-pad:40px;

  --dur-fast:140ms; --dur-med:220ms; --dur-slow:360ms;
}
@media (max-width:1024px){ :root{ --container-pad:24px } }
@media (max-width:640px){  :root{ --container-pad:16px } }

/* ---------- Tailwind theme (utilities: bg-primary, rounded-lg, shadow-sm, text-h1, font-display…) ---------- */
@theme {
  --color-primary:var(--iris-600);
  --color-primary-hover:var(--iris-700);
  --color-primary-active:var(--iris-800);
  --color-primary-subtle:var(--iris-50);
  --color-primary-border:var(--iris-200);
  --color-on-primary:var(--neutral-0);
  --color-accent:var(--saffron-400);
  --color-accent-strong:var(--saffron-500);
  --color-accent-subtle:var(--saffron-50);
  --color-rating:var(--saffron-400);

  --font-display:var(--font-bricolage), "Manrope", system-ui, sans-serif;
  --font-sans:var(--font-manrope), system-ui, -apple-system, "Segoe UI", sans-serif;

  --text-display:3.5rem; --text-display--line-height:1.1;
  --text-h1:2.5rem;      --text-h1--line-height:1.1;
  --text-h2:2rem;        --text-h2--line-height:1.25;
  --text-h3:1.5rem;      --text-h3--line-height:1.25;
  --text-h4:1.25rem;     --text-h4--line-height:1.25;
  --text-lg:1.125rem;    --text-lg--line-height:1.65;
  --text-base:1rem;      --text-base--line-height:1.5;
  --text-sm:.875rem;     --text-sm--line-height:1.5;
  --text-caption:.75rem; --text-caption--line-height:1.5;

  --radius-xs:4px; --radius-sm:6px; --radius-md:10px; --radius-lg:14px;
  --radius-xl:20px; --radius-2xl:28px; --radius-full:9999px;

  --shadow-xs:0 1px 2px rgba(26,26,35,.04);
  --shadow-sm:0 1px 3px rgba(26,26,35,.06),0 1px 2px rgba(26,26,35,.04);
  --shadow-md:0 4px 12px rgba(26,26,35,.06),0 2px 4px rgba(26,26,35,.04);
  --shadow-lg:0 12px 28px rgba(26,26,35,.08),0 4px 10px rgba(26,26,35,.04);
  --shadow-xl:0 24px 48px rgba(26,26,35,.12),0 8px 16px rgba(26,26,35,.05);
  --shadow-primary:0 8px 24px rgba(106,47,214,.28);

  --ease-out:cubic-bezier(.22,1,.36,1);
  --ease-inout:cubic-bezier(.65,0,.35,1);

  --breakpoint-xs:481px; --breakpoint-sm:721px; --breakpoint-md:901px;
  --breakpoint-lg:1025px; --breakpoint-xl:1201px; --breakpoint-2xl:1441px;
}

/* Semantic surfaces/text/borders exposed as utilities (distinct names → no self-reference) */
@theme inline {
  --color-page:var(--surface-page);
  --color-card:var(--surface-card);
  --color-sunken:var(--surface-sunken);
  --color-hover:var(--surface-hover);
  --color-inverse:var(--surface-inverse);
  --color-fg-strong:var(--text-strong);
  --color-fg:var(--text-body);
  --color-fg-muted:var(--text-muted);
  --color-fg-subtle:var(--text-subtle);
  --color-fg-compare:var(--text-compare);
  --color-line:var(--border-subtle);
  --color-line-default:var(--border-default);
  --color-line-strong:var(--border-strong);
  --color-iris-50:var(--iris-50);   --color-iris-100:var(--iris-100); --color-iris-200:var(--iris-200);
  --color-iris-400:var(--iris-400); --color-iris-500:var(--iris-500); --color-iris-600:var(--iris-600);
  --color-iris-700:var(--iris-700); --color-iris-800:var(--iris-800); --color-iris-900:var(--iris-900);
  --color-saffron-50:var(--saffron-50); --color-saffron-400:var(--saffron-400); --color-saffron-700:var(--saffron-700);
  --color-success-50:var(--success-50); --color-success-500:var(--success-500); --color-success-600:var(--success-600);
  --color-warning-50:var(--warning-50); --color-warning-500:var(--warning-500); --color-warning-600:var(--warning-600);
  --color-error-50:var(--error-50);     --color-error-500:var(--error-500);     --color-error-600:var(--error-600);
  --color-info-50:var(--info-50);       --color-info-500:var(--info-500);       --color-info-600:var(--info-600);
}

/* ---------- Dark theme: token remap only ---------- */
html[data-theme="dark"] {
  color-scheme:dark;
  --surface-page:var(--neutral-950); --surface-card:var(--neutral-900); --surface-sunken:var(--neutral-800);
  --surface-hover:var(--neutral-800); --surface-inverse:var(--neutral-800);
  --text-strong:var(--neutral-50); --text-body:var(--neutral-300); --text-muted:var(--neutral-400);
  --text-subtle:var(--neutral-500); --text-compare:var(--neutral-500);
  --border-subtle:color-mix(in oklch, var(--neutral-700) 65%, var(--neutral-900));
  --border-default:var(--neutral-700); --border-strong:var(--neutral-600);
  --color-primary:var(--iris-500); --color-primary-hover:var(--iris-400);
  --color-primary-subtle:color-mix(in oklch, var(--iris-500) 20%, var(--neutral-900));
  --iris-50:color-mix(in oklch, var(--iris-500) 18%, var(--neutral-900));
  --iris-100:color-mix(in oklch, var(--iris-500) 30%, var(--neutral-900));
  --iris-200:color-mix(in oklch, var(--iris-500) 45%, var(--neutral-900));
  --saffron-50:color-mix(in oklch, var(--saffron-500) 18%, var(--neutral-900)); --saffron-600:var(--saffron-400); --saffron-700:var(--saffron-300);
  --success-50:color-mix(in oklch, var(--success-500) 20%, var(--neutral-900)); --success-600:var(--success-500);
  --warning-50:color-mix(in oklch, var(--warning-500) 20%, var(--neutral-900)); --warning-600:var(--warning-500);
  --error-50:color-mix(in oklch, var(--error-500) 20%, var(--neutral-900));     --error-600:var(--error-500);
  --info-50:color-mix(in oklch, var(--info-500) 20%, var(--neutral-900));       --info-600:var(--info-500);
  --neutral-100:var(--neutral-800); --neutral-150:var(--neutral-700);
  --shadow-xs:0 1px 2px rgba(0,0,0,.35);
  --shadow-sm:0 1px 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3);
  --shadow-md:0 4px 12px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.3);
  --shadow-lg:0 12px 28px rgba(0,0,0,.45),0 4px 10px rgba(0,0,0,.3);
  --shadow-xl:0 24px 48px rgba(0,0,0,.55),0 8px 16px rgba(0,0,0,.35);
}

/* ---------- Base ---------- */
html { font-size:17px; }
body { background:var(--surface-page); color:var(--text-body); font-family:var(--font-sans); -webkit-font-smoothing:antialiased; }
a { color:var(--color-primary); } a:hover { color:var(--color-primary-hover); }
::selection { background:var(--iris-200); }
html.rz *, html.rz *::before, html.rz *::after { transition:none !important; animation:none !important; }
@keyframes shimmer { to { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
}
```

**Utility cheat-sheet:** `bg-page` · `bg-card` · `bg-sunken` · `text-fg-strong` · `text-fg` · `text-fg-muted` · `border-line` · `bg-primary text-on-primary hover:bg-primary-hover` · `bg-primary-subtle` · `rounded-md` (buttons) · `rounded-lg` (cards) · `shadow-sm hover:shadow-lg` · `font-display text-h2 tracking-[-0.02em]` · `tabular-nums` · `duration-[var(--dur-med)] ease-out`.
